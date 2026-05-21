import { writeFile } from 'node:fs/promises';

import { Command } from 'commander';

import { getDiagramSchema } from '../../core/index.js';

export function registerSchemaCommand(program: Command): void {
  program
    .command('schema')
    .description('Print the v1 diagram JSON Schema')
    .option('--out [path]', 'Write schema to a file instead of stdout')
    .action(async (options: { out?: string }) => {
      const schemaText = JSON.stringify(getDiagramSchema(), null, 2);

      if (options.out) {
        await writeFile(options.out, schemaText, 'utf8');
        return;
      }

      process.stdout.write(schemaText + '\n');
    });
}
