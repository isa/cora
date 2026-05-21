import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Command } from 'commander';

import { registerSchemaCommand } from './commands/schema.js';
import { registerValidateCommand } from './commands/validate.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJson = JSON.parse(
  readFileSync(join(__dirname, '../package.json'), 'utf8'),
) as { version: string };

const autoYes =
  process.env.CORA_AUTO_INSTALL === '1' || process.env.CORA_AUTO_INSTALL === 'true';

const program = new Command();

program
  .name('cora')
  .description('Diagram tool for AI coding agents — YAML in, SVG/PDF out')
  .version(packageJson.version)
  .option(
    '--yes',
    'Non-interactive mode for future install prompts (also: CORA_AUTO_INSTALL=1)',
    autoYes,
  );

registerValidateCommand(program);
registerSchemaCommand(program);

program.parseAsync(process.argv).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
