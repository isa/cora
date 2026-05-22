/**
 * Lazy Chromium install plumbing for the `--quality=high` lane.
 *
 * Three exports:
 * - `chromiumInstalled()` — synchronous presence check; the install marker
 *   is "directory exists and is non-empty" (Playwright populates it with
 *   `chromium-<rev>/` subdirs).
 * - `installChromium({quiet})` — spawns `npx playwright install chromium`
 *   with `PLAYWRIGHT_BROWSERS_PATH=CHROMIUM_DIR`. The spawned process
 *   receives an explicit ALLOWLISTED env object (T-03-02: do NOT spread
 *   `process.env` — that would forward attacker-controlled env vars like
 *   `NODE_OPTIONS=--require=evil.js` or `npm_config_registry=...`).
 * - `promptUser(message)` — single y/N TTY prompt for the interactive
 *   install confirmation.
 *
 * Test seam: when `CORA_TEST_PLAYWRIGHT_INSTALL_STUB` is set, the install
 * function shells out to that script instead of `npx`, so integration
 * tests can verify the install plumbing without downloading 170MB.
 */
import { spawn } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';

import { CHROMIUM_DIR } from './paths.js';

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
  const env: Record<string, string> = {
    PATH: process.env.PATH ?? '',
    HOME: process.env.HOME ?? '',
    LOCALAPPDATA: process.env.LOCALAPPDATA ?? '',
    PLAYWRIGHT_BROWSERS_PATH: CHROMIUM_DIR,
  };

  // Test seam: lets integration tests exercise the install path without
  // pulling 170MB of Chromium binaries.
  const stub = process.env.CORA_TEST_PLAYWRIGHT_INSTALL_STUB;
  const cmd = stub ? stub : 'npx';
  const args = stub ? [] : ['playwright', 'install', 'chromium'];

  await new Promise<void>((resolve, reject) => {
    const child = spawn(cmd, args, {
      env,
      stdio: opts.quiet ? 'pipe' : 'inherit',
    });
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`playwright install exited ${code}`));
    });
    child.on('error', (err: Error) => {
      reject(err);
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
