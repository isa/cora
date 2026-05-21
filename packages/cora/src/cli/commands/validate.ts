import { Command } from 'commander';

import { ParseError, parseFile, validateDocument } from '../../core/index.js';
import { formatValidationResult } from '../output.js';

export function registerValidateCommand(program: Command): void {
  program
    .command('validate')
    .description('Validate a diagram file against the JSON Schema')
    .argument('[file]', 'Path to diagram YAML or JSON file')
    .option('--format [fmt]', 'Output format: text or json', 'text')
    .action(async (file: string | undefined, options: { format?: string }) => {
      if (!file) {
        program.error('Missing required argument: file');
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

        if (options.format === 'json' || !process.stdout.isTTY) {
          process.stdout.write('[]\n');
        }
      } catch (error) {
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
      }
    });
}
