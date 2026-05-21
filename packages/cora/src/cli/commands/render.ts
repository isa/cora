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
import { renderToPNG, resolvePngScale, type PngSize } from '../../renderer/renderToPNG.js';
import { renderToSVG } from '../../renderer/renderToSVG.js';
import { formatValidationResult, isJsonOutput } from '../output.js';

function outputFormat(path: string): 'svg' | 'png' {
  const ext = extname(path).toLowerCase();
  if (ext === '.png') {
    return 'png';
  }
  if (ext === '.svg' || ext === '') {
    return 'svg';
  }
  throw new Error(
    `Unsupported output extension "${ext}". Use .svg or .png (e.g. diagram.png).`,
  );
}

export function registerRenderCommand(program: Command): void {
  program
    .command('render')
    .description('Render a diagram YAML/JSON file to SVG or PNG (requires -o)')
    .argument('[file]', 'Path to diagram YAML or JSON file')
    .requiredOption(
      '-o, --output <path>',
      'Output path; format from extension (.svg or .png)',
    )
    .option('--format [fmt]', 'Error output format: text or json', 'text')
    .option(
      '--size <size>',
      'PNG output scale: sm, md, lg, xl, xxl (default md)',
      'md',
    )
    .option('--without-shadow', 'Render without drop shadows on nodes')
    .option('--monochrome', 'Render using only black, grey, and white')
    .action(
      async (
        file: string | undefined,
        options: {
          output: string;
          format?: string;
          size?: string;
          withoutShadow?: boolean;
          monochrome?: boolean;
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

        let format: 'svg' | 'png';
        try {
          format = outputFormat(options.output);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          program.error(message);
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
