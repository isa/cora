import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Command } from 'commander';

import { registerRenderCommand } from './commands/render.js';
import { registerSchemaCommand } from './commands/schema.js';
import { registerValidateCommand } from './commands/validate.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJson = JSON.parse(
  readFileSync(join(__dirname, '../package.json'), 'utf8'),
) as { version: string };

function isDevEnvironment(): boolean {
  const possibleSrcDirs = [
    resolve(__dirname, '../src'),
    resolve(__dirname, '..'),
  ];
  return possibleSrcDirs.some(dir => existsSync(dir) && existsSync(join(dir, 'cli/index.ts')));
}

const autoYes =
  process.env.CORA_AUTO_INSTALL === '1' || process.env.CORA_AUTO_INSTALL === 'true';

const program = new Command();

program
  .name('cora')
  .description('Diagram tool for AI coding agents — YAML in, SVG/PNG out')
  .version(packageJson.version)
  .option(
    '--yes',
    'Non-interactive mode for future install prompts (also: CORA_AUTO_INSTALL=1)',
    autoYes,
  );

async function main() {
  registerValidateCommand(program);
  registerSchemaCommand(program);
  registerRenderCommand(program);

  if (isDevEnvironment()) {
    try {
      const { registerPreviewCommand } = await import('./commands/preview.js');
      registerPreviewCommand(program);
    } catch {
      // Preview unavailable — silently skip in production
    }
  }

  await program.parseAsync(process.argv);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
