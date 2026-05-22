import pc from 'picocolors';

import type { StructuredError } from '../core/types.js';

export interface OutputOptions {
  format?: string;
}

/** True when --format json or stdout is not a TTY (CI / piped). */
export function isJsonOutput(opts: OutputOptions = {}): boolean {
  if (opts.format === 'json') {
    return true;
  }
  return !process.stdout.isTTY;
}

/**
 * True when Cora must not block on a TTY prompt. Broader than
 * `isJsonOutput`: also fires under `CI=1`/`CI=true` even on a TTY-attached
 * shell. Used by the `--quality=high` lane to choose between emitting a
 * structured JSON error vs. asking the user to confirm the Chromium download.
 */
export function isNonInteractive(opts: OutputOptions = {}): boolean {
  if (opts.format === 'json') return true;
  if (process.env.CI === '1' || process.env.CI === 'true') return true;
  if (!process.stdout.isTTY) return true;
  return false;
}

/**
 * True when the user has opted in to automatic install of optional
 * binaries (currently: Chromium for `--quality=high`). Honors the global
 * `--yes` flag and the `CORA_AUTO_INSTALL=1` env var (matching Phase 1
 * semantics in `src/cli/index.ts`).
 */
export function shouldAutoInstall(flags: { yes?: boolean } = {}): boolean {
  return flags.yes === true || process.env.CORA_AUTO_INSTALL === '1';
}

export function formatValidationResult(
  errors: StructuredError[],
  opts: OutputOptions & { file?: string } = {},
): string {
  if (isJsonOutput(opts)) {
    return JSON.stringify(errors, null, 2);
  }

  const file = opts.file ?? 'diagram';
  const lines = [pc.red(`✖ ${errors.length} error(s) in ${file}`)];

  for (const error of errors) {
    const pathPart = error.path ? `${error.path}: ` : '';
    lines.push(
      `  ${pc.bold(`[${error.code}]`)} ${pathPart}${error.message}`,
    );
    if (error.suggestion) {
      lines.push(`    ${pc.dim(`→ ${error.suggestion}`)}`);
    }
  }

  return lines.join('\n');
}
