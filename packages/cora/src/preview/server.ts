import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { createServer, type InlineConfig, type ViteDevServer } from 'vite';

export interface PreviewServerOptions {
  host?: string;
  port?: number;
  open?: boolean;
  root?: string;
}

export interface PreviewServer {
  url: string;
  vite: ViteDevServer;
  close(): Promise<void>;
}

function packageRoot(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    resolve(here),
    resolve(here, 'preview'),
    resolve(here, '../preview'),
    resolve(process.cwd(), 'src/preview'),
    resolve(process.cwd(), 'dist/preview'),
  ];
  return candidates.find((candidate) => existsSync(join(candidate, 'index.html'))) ?? candidates[0]!;
}

export function resolvePreviewRoot(root?: string): string {
  return root ? resolve(root) : packageRoot();
}

export function createPreviewServerConfig(options: PreviewServerOptions = {}): InlineConfig {
  const host = options.host ?? '127.0.0.1';
  const port = options.port ?? 4173;

  return {
    root: resolvePreviewRoot(options.root),
    configFile: false,
    server: {
      host,
      port,
      strictPort: false,
      fs: {
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

export async function startPreviewServer(
  options: PreviewServerOptions = {},
): Promise<PreviewServer> {
  const vite = await createServer(createPreviewServerConfig(options));
  await vite.listen();

  const address = vite.httpServer?.address();
  const host = options.host ?? '127.0.0.1';
  const port =
    typeof address === 'object' && address !== null ? address.port : (options.port ?? 4173);

  return {
    vite,
    url: `http://${host}:${port}/`,
    close: () => vite.close(),
  };
}
