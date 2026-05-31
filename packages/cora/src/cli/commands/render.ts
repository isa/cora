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
  resolveThemeNameInput,
  listInstalledThemeIds,
  terminateElkWorker,
  validateDocument,
} from '../../core/index.js';
import { defaultTheme } from '../../renderer/themes/default.js';
import { toMonochrome, withoutShadow } from '../../renderer/themes/transforms.js';
import { renderToPDF } from '../../renderer/renderToPDF.js';
import { type PageName, PAGE_SIZES } from '../../renderer/pdf/pageSize.js';
import { renderToPNG, resolvePngScale, type PngSize } from '../../renderer/renderToPNG.js';
import { renderToSVG } from '../../renderer/renderToSVG.js';
import { renderToText, type TextCharset } from '../../renderer/renderToText.js';
import { renderToTextFromSvg } from '../../renderer/renderToTextFromSvg.js';
import {
  formatValidationResult,
  isJsonOutput,
  isNonInteractive,
  shouldAutoInstall,
} from '../output.js';
import { CHROMIUM_DIR } from '../paths.js';
import {
  ChromiumInstallError,
  chromiumInstalled,
  installChromium,
  promptUser,
} from '../playwrightInstall.js';

function outputFormat(path: string | undefined): 'svg' | 'png' | 'pdf' | 'txt' {
  if (!path) {
    return 'txt';
  }
  const ext = extname(path).toLowerCase();
  if (ext === '.txt') {
    return 'txt';
  }
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
    `Unsupported output extension "${ext}". Use .svg, .png, .pdf, or .txt (e.g. diagram.txt).`,
  );
}

function parseCharset(value: string): TextCharset {
  if (value === 'unicode' || value === 'ascii') {
    return value;
  }
  throw new Error(`Invalid --charset value "${value}". Use one of: unicode, ascii.`);
}

export function registerRenderCommand(program: Command): void {
  program
    .command('render')
    .description(
      'Render a diagram YAML/JSON file to SVG, PNG, PDF, or text (omit -o for stdout text)',
    )
    .argument('[file]', 'Path to diagram YAML or JSON file')
    .option(
      '-o, --output <path>',
      'Output path; format from extension (.svg, .png, .pdf, or .txt). Omit for stdout text.',
    )
    .option('--format [fmt]', 'Error output format: text or json', 'text')
    .option(
      '--charset <charset>',
      'Text output charset: unicode or ascii',
      'unicode',
    )
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
    .option(
      '--ascii-engine <engine>',
      'ASCII/Text rendering engine: layout or svg',
      'svg',
    )
    .option(
      '--theme <id>',
      'Diagram theme id or label slug (overrides diagram.theme in the file)',
    )
    .action(
      async (
        file: string | undefined,
        options: {
          output?: string;
          format?: string;
          charset?: string;
          size?: string;
          withoutShadow?: boolean;
          monochrome?: boolean;
          page?: string;
          quality?: string;
          asciiEngine?: string;
          theme?: string;
        },
      ) => {
        if (!file) {
          program.error('Missing required argument: file');
        }

        let format: 'svg' | 'png' | 'pdf' | 'txt';
        try {
          format = outputFormat(options.output);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          program.error(message);
        }

        let charset: TextCharset;
        try {
          charset = parseCharset(options.charset ?? 'unicode');
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          program.error(message);
        }

        if (options.quality !== undefined && options.quality !== 'high') {
          program.error('Invalid --quality value. Only "high" is supported.');
        }

        if (
          options.asciiEngine !== undefined &&
          options.asciiEngine !== 'layout' &&
          options.asciiEngine !== 'svg'
        ) {
          program.error(
            `Invalid --ascii-engine value "${options.asciiEngine}". Use one of: layout, svg.`,
          );
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
          if (options.theme) {
            const resolvedTheme = resolveThemeNameInput(options.theme);
            if (!resolvedTheme) {
              program.error(
                `Unknown theme "${options.theme}". Use one of: ${listInstalledThemeIds().join(', ')}`,
              );
            }
            doc.diagram = { ...doc.diagram, theme: resolvedTheme };
          }
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

          if (format === 'txt') {
            const text =
              options.asciiEngine === 'svg'
                ? renderToTextFromSvg(layouted, { charset })
                : renderToText(layouted, { charset });
            if (options.output) {
              mkdirSync(dirname(options.output), { recursive: true });
              writeFileSync(options.output, text, 'utf8');
            } else {
              process.stdout.write(text);
            }
            return;
          }

          const svg = renderToSVG(layouted);

          mkdirSync(dirname(options.output!), { recursive: true });
          if (format === 'png') {
            try {
              resolvePngScale(options.size);
            } catch (error) {
              const message =
                error instanceof Error ? error.message : String(error);
              program.error(message);
            }
            writeFileSync(
              options.output!,
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
              const yes = program.opts().yes === true;

              if (options.quality === 'high') {
                // High-quality lane: lazy Chromium install + Playwright render.
                if (!chromiumInstalled()) {
                  if (shouldAutoInstall({ yes })) {
                    await installChromium({
                      quiet: isNonInteractive({ format: options.format }),
                    });
                  } else if (isNonInteractive({ format: options.format })) {
                    // No TTY / CI / --format=json AND no auto-install consent →
                    // hard fail with a structured JSON error (D-07, D-08).
                    const err = {
                      code: 'CHROMIUM_NOT_INSTALLED' as const,
                      path: '/quality',
                      message:
                        'Chromium is required for --quality=high but is not installed. ' +
                        'Pass --yes, set CORA_AUTO_INSTALL=1, or run interactively to accept the prompt.',
                      suggestion: `cora render … --quality=high --yes  (downloads Chromium to ${CHROMIUM_DIR})`,
                    };
                    if (isJsonOutput({ format: options.format })) {
                      process.stdout.write(
                        JSON.stringify([err], null, 2) + '\n',
                      );
                    } else {
                      process.stderr.write(
                        pc.red(`✖ [${err.code}] ${err.message}\n`),
                      );
                    }
                    process.exitCode = 1;
                    return;
                  } else {
                    // Interactive TTY — one prompt; cached after first install.
                    const confirmed = await promptUser(
                      `Cora needs to download Chromium (~170MB) to ${CHROMIUM_DIR}. Proceed?`,
                    );
                    if (!confirmed) {
                      process.exitCode = 1;
                      return;
                    }
                    await installChromium({ quiet: false });
                  }
                }

                // D-09: no silent fallback. Any failure inside the
                // high-quality branch propagates and exits non-zero.
                const { renderToPDFHighQuality } = await import(
                  '../../renderer/renderToPDFHighQuality.js'
                );
                const pdfBytes = await renderToPDFHighQuality(svg, {
                  page: options.page as PageName | undefined,
                });
                writeFileSync(options.output!, pdfBytes);
              } else {
                const pdfBytes = await renderToPDF(layouted, svg, {
                  page: options.page as PageName | undefined,
                  ciMode,
                });
                writeFileSync(options.output!, Buffer.from(pdfBytes));
              }
            } catch (error) {
              // Lazy-load the HighQualityRenderError class so the
              // default PDF path doesn't have to import the
              // Playwright-bound module just to do an instanceof check.
              const { HighQualityRenderError } = await import(
                '../../renderer/renderToPDFHighQuality.js'
              );

              const isResvgWarning =
                error instanceof Error &&
                error.message?.startsWith('resvg font warnings');
              const isLayout = error instanceof LayoutError;
              const isInstallFailure = error instanceof ChromiumInstallError;
              const isHighQualityFailure =
                error instanceof HighQualityRenderError;

              const code = isResvgWarning
                ? 'RESVG_FONT_WARNING'
                : isLayout
                  ? 'LAYOUT_ERROR'
                  : isInstallFailure
                    ? 'CHROMIUM_INSTALL_FAILED'
                    : isHighQualityFailure
                      ? 'HIGH_QUALITY_RENDER_FAILED'
                      : undefined;
              if (!code) {
                throw error;
              }

              const path = isResvgWarning
                ? '/render/resvg'
                : isInstallFailure || isHighQualityFailure
                  ? '/quality'
                  : '/render/layout';
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
            writeFileSync(options.output!, svg, 'utf8');
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
