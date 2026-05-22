import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, extname } from 'node:path';

import { Command } from 'commander';
import pc from 'picocolors';

import {
  LayoutError,
  ParseError,
  applyNodeStyles,
  computeLayout,
  measureNodes,
  parseFile,
  resolveTheme,
  terminateElkWorker,
  validateDocument,
} from '../../core/index.js';
import { defaultTheme } from '../../renderer/themes/default.js';
import { toMonochrome, withoutShadow } from '../../renderer/themes/transforms.js';
import { renderToPDF } from '../../renderer/renderToPDF.js';
import { type PageName, PAGE_SIZES } from '../../renderer/pdf/pageSize.js';
import { renderToPNG, resolvePngScale, type PngSize } from '../../renderer/renderToPNG.js';
import { renderToSVG } from '../../renderer/renderToSVG.js';
import { formatValidationResult, isJsonOutput } from '../output.js';

function outputFormat(path: string): 'svg' | 'png' | 'pdf' {
  const ext = extname(path).toLowerCase();
  if (ext === '.png') {
    return 'png';
  }
  if (ext === '.pdf') {
    return 'pdf';
  }
  if (ext === '.svg' || ext === '') {
    return 'svg';
  }
  throw new Error(
    `Unsupported output extension "${ext}". Use .svg, .png, or .pdf (e.g. diagram.pdf).`,
  );
}

export function registerRenderCommand(program: Command): void {
  program
    .command('render')
    .description(
      'Render a diagram YAML/JSON file to SVG, PNG, or PDF (requires -o)',
    )
    .argument('[file]', 'Path to diagram YAML or JSON file')
    .requiredOption(
      '-o, --output <path>',
      'Output path; format from extension (.svg, .png, or .pdf)',
    )
    .option('--format [fmt]', 'Error output format: text or json', 'text')
    .option(
      '--size <size>',
      'PNG output scale: sm, md, lg, xl, xxl (default md)',
      'md',
    )
    .option('--without-shadow', 'Render without drop shadows on nodes')
    .option('--monochrome', 'Render using only black, grey, and white')
    .option(
      '--page <size>',
      'PDF page size: a4, letter, a4-portrait, letter-portrait (default: fit-to-content)',
    )
    .option(
      '--quality <level>',
      'PDF quality: high (uses Playwright) — default uses bundled resvg + pdf-lib',
    )
    .action(
      async (
        file: string | undefined,
        options: {
          output: string;
          format?: string;
          size?: string;
          withoutShadow?: boolean;
          monochrome?: boolean;
          page?: string;
          quality?: string;
        },
      ) => {
        if (!file) {
          program.error('Missing required argument: file');
        }

        if (!options.output) {
          program.error(
            'Missing required option: -o <path>. Example: cora render diagram.yaml -o out.svg',
          );
        }

        let format: 'svg' | 'png' | 'pdf';
        try {
          format = outputFormat(options.output);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          program.error(message);
        }

        if (options.quality !== undefined && options.quality !== 'high') {
          program.error('Invalid --quality value. Only "high" is supported.');
        }

        try {
          const parsed = await parseFile(file);
          const errors = validateDocument(parsed.document);

          if (errors.length > 0) {
            process.stdout.write(
              formatValidationResult(errors, {
                format: options.format,
                file,
              }) + '\n',
            );
            process.exitCode = 1;
            return;
          }

          const doc = parsed.document as { version: 1; diagram: import('../../core/types.js').Diagram };
          let baseTheme = defaultTheme;
          if (options.monochrome) baseTheme = toMonochrome(baseTheme);
          if (options.withoutShadow) baseTheme = withoutShadow(baseTheme);
          const { nodeStyles, theme } = resolveTheme(doc.diagram, baseTheme);
          const measured = applyNodeStyles(
            measureNodes(doc.diagram.nodes),
            nodeStyles,
          );
          const layouted = await computeLayout({
            diagram: doc.diagram,
            measuredNodes: measured,
            theme,
          });
          const svg = renderToSVG(layouted);

          mkdirSync(dirname(options.output), { recursive: true });
          if (format === 'png') {
            try {
              resolvePngScale(options.size);
            } catch (error) {
              const message =
                error instanceof Error ? error.message : String(error);
              program.error(message);
            }
            writeFileSync(
              options.output,
              renderToPNG(svg, { size: options.size as PngSize }),
            );
          } else if (format === 'pdf') {
            try {
              if (
                options.page !== undefined &&
                !(options.page in PAGE_SIZES)
              ) {
                program.error(
                  `Invalid --page value "${options.page}". Use one of: ${Object.keys(PAGE_SIZES).join(', ')}.`,
                );
              }

              const ciMode =
                process.env.CI === '1' || process.env.CI === 'true';

              if (options.quality === 'high') {
                // Plan 03 wires high-quality lane here — falls through to default for now
              }

              const pdfBytes = await renderToPDF(layouted, svg, {
                page: options.page as PageName | undefined,
                ciMode,
              });
              writeFileSync(options.output, Buffer.from(pdfBytes));
            } catch (error) {
              const isResvgWarning =
                error instanceof Error &&
                error.message?.startsWith('resvg font warnings');
              const isChromiumMissing =
                (error as { code?: string })?.code === 'CHROMIUM_NOT_INSTALLED';
              const isLayout = error instanceof LayoutError;

              if (isChromiumMissing) {
                // Plan 03 owns CHROMIUM_NOT_INSTALLED emission; rethrow.
                throw error;
              }

              const code = isResvgWarning
                ? 'RESVG_FONT_WARNING'
                : isLayout
                  ? 'LAYOUT_ERROR'
                  : undefined;
              if (!code) {
                throw error;
              }

              const path = isResvgWarning ? '/render/resvg' : '/render/layout';
              const message = (error as Error).message;
              if (isJsonOutput({ format: options.format })) {
                process.stdout.write(
                  JSON.stringify([{ code, path, message }]) + '\n',
                );
              } else {
                process.stderr.write(
                  pc.red(`Error [${code}]: ${message}\n`),
                );
              }
              process.exitCode = 1;
              return;
            }
          } else {
            writeFileSync(options.output, svg, 'utf8');
          }
        } catch (error) {
          if (error instanceof LayoutError) {
            const message = error.message;
            if (isJsonOutput({ format: options.format })) {
              process.stdout.write(
                JSON.stringify(
                  [
                    {
                      code: 'LAYOUT_ERROR',
                      path: '/diagram/layout',
                      message,
                    },
                  ],
                  null,
                  2,
                ) + '\n',
              );
            } else {
              console.error(pc.red(`✖ ${message}`));
            }
            process.exitCode = 1;
            return;
          }

          const structured =
            error instanceof ParseError
              ? error.structured
              : {
                  code: 'PARSE_ERROR' as const,
                  path: '',
                  message:
                    error instanceof Error ? error.message : String(error),
                };

          process.stdout.write(
            formatValidationResult([structured], {
              format: options.format,
              file,
            }) + '\n',
          );
          process.exitCode = 1;
        } finally {
          await terminateElkWorker();
        }
      },
    );
}
