import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import {
  createServer,
  preview as vitePreview,
  type InlineConfig,
  type PreviewServer as VitePreviewServer,
  type ViteDevServer,
} from 'vite';

import { iconPackDevPlugin } from './iconPackDevPlugin.js';

export interface PreviewServerOptions {
  host?: string;
  port?: number;
  open?: boolean;
  root?: string;
}

export interface PreviewServer {
  url: string;
  vite?: ViteDevServer;
  close(): Promise<void>;
}

type PreviewTarget =
  | { mode: 'dev'; root: string; pkgRoot: string }
  | { mode: 'dist'; root: string; pkgRoot: string };

function locatePackageRoot(): string {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let depth = 0; depth < 8; depth++) {
    if (
      existsSync(join(dir, 'package.json')) &&
      (existsSync(join(dir, 'src', 'preview', 'index.html')) ||
        existsSync(join(dir, 'preview-dist', 'index.html')))
    ) {
      return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }
  throw new Error(
    'Could not locate the cora package root. Run from a source checkout or build preview assets with `bun run build`.',
  );
}

function resolvePreviewTarget(explicitRoot?: string): PreviewTarget {
  const pkgRoot = explicitRoot ? resolve(explicitRoot, '../..') : locatePackageRoot();
  const srcPreview = join(pkgRoot, 'src/preview');
  const previewDist = join(pkgRoot, 'preview-dist');

  if (explicitRoot) {
    const root = resolve(explicitRoot);
    return { mode: 'dev', root, pkgRoot };
  }

  if (existsSync(join(srcPreview, 'index.html')) && existsSync(join(srcPreview, 'main.tsx'))) {
    return { mode: 'dev', root: srcPreview, pkgRoot };
  }

  if (existsSync(join(previewDist, 'index.html'))) {
    return { mode: 'dist', root: previewDist, pkgRoot };
  }

  throw new Error(
    'Preview assets not found. Run `bun run build` in packages/cora (creates preview-dist/) or use a source checkout with src/preview/.',
  );
}

export function resolvePreviewRoot(root?: string): string {
  return resolvePreviewTarget(root).root;
}

export function createPreviewServerConfig(options: PreviewServerOptions = {}): InlineConfig {
  const target = resolvePreviewTarget(options.root);
  const host = options.host ?? '127.0.0.1';
  const port = options.port ?? 4173;

  if (target.mode === 'dist') {
    return {
      root: target.root,
      configFile: false,
      preview: {
        host,
        port,
        strictPort: false,
      },
    };
  }

  return {
    root: target.root,
    configFile: false,
    plugins: [iconPackDevPlugin()],
    server: {
      host,
      port,
      strictPort: false,
      fs: {
        allow: [target.pkgRoot, target.root],
        strict: true,
      },
    },
    appType: 'spa',
    clearScreen: false,
  };
}

export async function openBrowser(url: string): Promise<void> {
  const command =
    process.platform === 'darwin'
      ? 'open'
      : process.platform === 'win32'
        ? 'cmd'
        : 'xdg-open';
  const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url];

  const child = spawn(command, args, {
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
}

function resolveUrl(host: string, port: number): string {
  return `http://${host}:${port}/`;
}

function readListeningPort(
  httpServer: ViteDevServer['httpServer'] | VitePreviewServer['httpServer'],
  fallback: number,
): number {
  const address = httpServer?.address();
  return typeof address === 'object' && address !== null ? address.port : fallback;
}

export async function startPreviewServer(
  options: PreviewServerOptions = {},
): Promise<PreviewServer> {
  const target = resolvePreviewTarget(options.root);
  const host = options.host ?? '127.0.0.1';
  const port = options.port ?? 4173;

  if (target.mode === 'dist') {
    const server = await vitePreview({
      root: target.root,
      configFile: false,
      preview: {
        host,
        port,
        strictPort: false,
      },
    });

    return {
      url: resolveUrl(host, readListeningPort(server.httpServer, port)),
      close: () => server.close(),
    };
  }

  const vite = await createServer(createPreviewServerConfig({ ...options, root: target.root }));
  await vite.listen();

  return {
    vite,
    url: resolveUrl(host, readListeningPort(vite.httpServer, port)),
    close: () => vite.close(),
  };
}
