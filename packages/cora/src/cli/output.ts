import pc from 'picocolors';

import type { StructuredError } from '../../core/types.js';

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
