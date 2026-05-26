import { Command } from 'commander';

import {
  openBrowser,
  startPreviewServer,
  type PreviewServer,
} from '../../preview/server.js';

export interface RegisterPreviewCommandOptions {
  start?: typeof startPreviewServer;
  open?: typeof openBrowser;
  waitForSignal?: boolean;
}

function parsePort(value: string): number {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid --port value "${value}". Use a TCP port from 1 to 65535.`);
  }
  return port;
}

async function waitForShutdown(server: PreviewServer): Promise<void> {
  await new Promise<void>((resolve) => {
    let closing = false;
    const close = async () => {
      if (closing) {
        return;
      }
      closing = true;
      process.stdout.write('\nClosing preview server...\n');
      await server.close();
      resolve();
    };

    process.once('SIGINT', close);
    process.once('SIGTERM', close);
  });
}

export function registerPreviewCommand(
  program: Command,
  deps: RegisterPreviewCommandOptions = {},
): void {
  const start = deps.start ?? startPreviewServer;
  const open = deps.open ?? openBrowser;
  const waitForSignal = deps.waitForSignal ?? true;

  program
    .command('preview')
    .description('Open the local component preview workbench')
    .option('--host <host>', 'Host interface for the preview server', '127.0.0.1')
    .option('--port <port>', 'Port for the preview server', parsePort, 4173)
    .option('--no-open', 'Do not open the preview in the default browser')
    .action(async (options: { host: string; port: number; open: boolean }) => {
      const server = await start({
        host: options.host,
        port: options.port,
        open: options.open,
      });

      process.stdout.write(`Cora preview running at ${server.url}\n`);

      if (options.open) {
        await open(server.url);
      }

      if (waitForSignal) {
        await waitForShutdown(server);
      }
    });
}
