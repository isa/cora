/**
 * Lazy Chromium install plumbing for the `--quality=high` lane.
 *
 * Three exports:
 * - `chromiumInstalled()` — synchronous presence check; the install marker
 *   is "directory exists and is non-empty" (Playwright populates it with
 *   `chromium-<rev>/` subdirs).
 * - `installChromium({quiet})` — resolves the bundled `playwright/cli.js`
 *   via Node's resolution and spawns `node <cli.js> install chromium`
 *   with `PLAYWRIGHT_BROWSERS_PATH=CHROMIUM_DIR`. NOT `npx playwright`:
 *   npx resolves relative to cwd, and the cora binary is typically run
 *   from a parent directory where `playwright` isn't installed — that
 *   makes npx fall back to PATH and fail with `command not found`.
 *   The spawned process receives an explicit ALLOWLISTED env object
 *   (T-03-02: do NOT spread `process.env` — that would forward
 *   attacker-controlled env vars like `NODE_OPTIONS=--require=evil.js`).
 * - `promptUser(message)` — single y/N TTY prompt for the interactive
 *   install confirmation.
 *
 * Failures throw `ChromiumInstallError` so the CLI can distinguish
 * install failures from parse / layout / render errors and emit a
 * structured `CHROMIUM_INSTALL_FAILED` JSON error.
 *
 * Test seam: when `CORA_TEST_PLAYWRIGHT_INSTALL_STUB` is set, the install
 * function shells out to that script instead of resolving playwright,
 * so integration tests can verify the install plumbing without
 * downloading 170MB.
 */
import { spawn } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { createInterface } from 'node:readline/promises';

import { CHROMIUM_DIR } from './paths.js';

export class ChromiumInstallError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = 'ChromiumInstallError';
  }
}

export function chromiumInstalled(): boolean {
  if (!existsSync(CHROMIUM_DIR)) return false;
  try {
    return readdirSync(CHROMIUM_DIR).length > 0;
  } catch {
    return false;
  }
}

export interface InstallChromiumOptions {
  quiet: boolean;
}

export async function installChromium(
  opts: InstallChromiumOptions,
): Promise<void> {
  // Explicit allowlist — T-03-02. Do NOT spread process.env.
  // Proxy / cert env vars are forwarded so corporate networks work.
  const env: Record<string, string> = {
    PATH: process.env.PATH ?? '',
    HOME: process.env.HOME ?? '',
    LOCALAPPDATA: process.env.LOCALAPPDATA ?? '',
    PLAYWRIGHT_BROWSERS_PATH: CHROMIUM_DIR,
    ...(process.env.HTTPS_PROXY && { HTTPS_PROXY: process.env.HTTPS_PROXY }),
    ...(process.env.HTTP_PROXY && { HTTP_PROXY: process.env.HTTP_PROXY }),
    ...(process.env.NO_PROXY && { NO_PROXY: process.env.NO_PROXY }),
    ...(process.env.NODE_EXTRA_CA_CERTS && {
      NODE_EXTRA_CA_CERTS: process.env.NODE_EXTRA_CA_CERTS,
    }),
  };

  // Test seam: lets integration tests exercise the install path without
  // pulling 170MB of Chromium binaries.
  const stub = process.env.CORA_TEST_PLAYWRIGHT_INSTALL_STUB;

  let cmd: string;
  let args: string[];
  if (stub) {
    cmd = stub;
    args = [];
  } else {
    // Resolve playwright relative to THIS module, not relative to
    // the user's cwd. npx would walk up from cwd and fail when the
    // user invokes cora from a directory where playwright isn't
    // installed.
    //
    // `playwright`'s package.json exports map does NOT expose
    // `./cli.js`, so `require.resolve('playwright/cli.js')` throws
    // ERR_PACKAGE_PATH_NOT_EXPORTED. Resolve `playwright/package.json`
    // (which IS in exports), read its `bin.playwright` entry, and
    // join against the package directory — same path npm/npx uses
    // for the bin symlink.
    let cliPath: string;
    try {
      const req = createRequire(import.meta.url);
      const pkgPath = req.resolve('playwright/package.json');
      const pkg = req('playwright/package.json') as {
        bin?: string | { playwright?: string };
      };
      const binEntry =
        typeof pkg.bin === 'string'
          ? pkg.bin
          : (pkg.bin?.playwright ?? 'cli.js');
      cliPath = join(dirname(pkgPath), binEntry);
    } catch (err) {
      throw new ChromiumInstallError(
        'Could not locate the bundled `playwright` package. ' +
          'Reinstall cora or run `npm install playwright` in your project.',
        err,
      );
    }
    cmd = process.execPath; // current Node binary
    args = [cliPath, 'install', 'chromium'];
  }

  await new Promise<void>((resolve, reject) => {
    const child = spawn(cmd, args, {
      env,
      stdio: opts.quiet ? 'pipe' : 'inherit',
    });
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(
          new ChromiumInstallError(
            `Chromium download failed (playwright install exited ${code}). ` +
              `Check your network connection and re-run with --quality=high --yes.`,
          ),
        );
      }
    });
    child.on('error', (err: Error) => {
      reject(
        new ChromiumInstallError(
          `Could not start the playwright installer: ${err.message}`,
          err,
        ),
      );
    });
  });
}

export async function promptUser(message: string): Promise<boolean> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  try {
    const answer = await rl.question(`${message} [y/N] `);
    return /^y(es)?$/i.test(answer.trim());
  } finally {
    rl.close();
  }
}
