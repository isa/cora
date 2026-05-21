import { readFile } from 'node:fs/promises';
import { parse as parseYaml } from 'yaml';

import type { ParseResult, StructuredError } from './types.js';

export class ParseError extends Error {
  readonly structured: StructuredError;

  constructor(message: string) {
    super(message);
    this.name = 'ParseError';
    this.structured = {
      code: 'PARSE_ERROR',
      path: '',
      message,
    };
  }
}

export async function parseFile(sourcePath: string): Promise<ParseResult> {
  const content = await readFile(sourcePath, 'utf8');
  const format = sourcePath.endsWith('.json') ? 'json' : 'yaml';

  try {
    const document =
      format === 'json' ? JSON.parse(content) : parseYaml(content);
    return { sourcePath, format, document };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new ParseError(`Failed to parse ${format.toUpperCase()}: ${detail}`);
  }
}
