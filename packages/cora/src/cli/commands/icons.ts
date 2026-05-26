import type { Command } from 'commander';

import { buildIconCatalogIndex } from '../../renderer/iconPacks/catalogIndex.js';
import { listIconPacks } from '../../renderer/iconPacks/registry.js';
import { filterItems } from '../../preview/library/filterLibrary.js';
import { isJsonOutput } from '../output.js';

export function registerIconsCommand(program: Command): void {
  const icons = program
    .command('icons')
    .description('Search installed icon packs');

  icons
    .command('search')
    .argument('<query>', 'Search term')
    .option('--format <format>', 'Output format: text or json', 'text')
    .option('--limit <n>', 'Maximum results', '25')
    .action((query: string, options: { format?: string; limit?: string }) => {
      const limit = Number.parseInt(options.limit ?? '25', 10);
      const packs = listIconPacks(true);
      const index = buildIconCatalogIndex(packs);
      const matches = filterItems(index, query).slice(0, Number.isFinite(limit) ? limit : 25);

      if (isJsonOutput({ format: options.format })) {
        process.stdout.write(
          `${JSON.stringify(
            matches.map((entry) => ({
              provider: entry.provider,
              service: entry.service,
              packLabel: entry.packLabel,
              categories: entry.categoryIds,
            })),
            null,
            2,
          )}\n`,
        );
        return;
      }

      if (matches.length === 0) {
        console.log('No icons matched.');
        return;
      }

      for (const entry of matches) {
        console.log(`${entry.provider}:${entry.service} (${entry.packLabel})`);
      }
    });
}
