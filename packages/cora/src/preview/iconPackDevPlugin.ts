import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Plugin } from 'vite';

import { buildMergedCatalogJson } from '../renderer/iconPacks/catalogIndex.js';
import { listIconPacks, resetIconPackCache } from '../renderer/iconPacks/registry.js';

function sendJson(res: any, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function sendSvg(res: any, filePath: string): void {
  if (!existsSync(filePath)) {
    res.statusCode = 404;
    res.end('Not found');
    return;
  }
  res.statusCode = 200;
  res.setHeader('Content-Type', 'image/svg+xml');
  res.end(readFileSync(filePath, 'utf8'));
}

export function iconPackDevPlugin(): Plugin {
  return {
    name: 'cora-icon-packs',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split('?')[0] ?? '';

        if (url === '/icon-packs/catalog.json') {
          resetIconPackCache();
          const packs = listIconPacks(true);
          sendJson(res, 200, buildMergedCatalogJson(packs));
          return;
        }

        const manifestMatch = url.match(/^\/icon-packs\/([^/]+)\/manifest\.json$/);
        if (manifestMatch) {
          const provider = manifestMatch[1]!;
          const pack = listIconPacks(true).find((item) => item.manifest.id === provider);
          if (!pack) {
            res.statusCode = 404;
            res.end('Not found');
            return;
          }
          sendJson(res, 200, pack.manifest);
          return;
        }

        const iconMatch = url.match(/^\/icon-packs\/([^/]+)\/icons\/([^/]+)\.svg$/);
        if (iconMatch) {
          const provider = iconMatch[1]!;
          const slug = iconMatch[2]!;
          const pack = listIconPacks(true).find((item) => item.manifest.id === provider);
          if (!pack) {
            res.statusCode = 404;
            res.end('Not found');
            return;
          }
          const icon = pack.manifest.icons[slug];
          if (!icon) {
            res.statusCode = 404;
            res.end('Not found');
            return;
          }
          sendSvg(res, join(pack.rootPath, 'icons', icon.file));
          return;
        }

        next();
      });
    },
  };
}
