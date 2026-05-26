import { existsSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Command } from 'commander';

import { registerIconsCommand } from './commands/icons.js';
import { registerRenderCommand } from './commands/render.js';
import { registerSchemaCommand } from './commands/schema.js';
import { registerValidateCommand } from './commands/validate.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJson = JSON.parse(
  readFileSync(join(__dirname, '../package.json'), 'utf8'),
) as { version: string };

const autoYes =
  process.env.CORA_AUTO_INSTALL === '1' || process.env.CORA_AUTO_INSTALL === 'true';

function isDevEnvironment(): boolean {
  const srcDir = resolve(__dirname, '../src');
  return existsSync(srcDir);
}

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

registerValidateCommand(program);
registerSchemaCommand(program);
registerRenderCommand(program);
registerIconsCommand(program);

async function main(): Promise<void> {
  if (isDevEnvironment()) {
    try {
      const { registerPreviewCommand } = await import('./commands/preview.js');
      registerPreviewCommand(program);
    } catch {
      // Preview unavailable in production installs without devDependencies.
    }
  }

  await program.parseAsync(process.argv);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
