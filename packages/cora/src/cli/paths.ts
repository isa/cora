/**
 * Cross-platform config + browser-cache path resolution for Cora.
 *
 * Per PROJECT.md, Linux/mac users get `$HOME/.config/cora/` regardless of
 * what `env-paths` would default to (env-paths returns
 * `~/Library/Application Support/cora-nodejs/` on macOS, which contradicts
 * the project spec — see RESEARCH Pitfall 6). Windows uses `%LOCALAPPDATA%`
 * with an env-paths fallback if LOCALAPPDATA is unset.
 *
 * The `CORA_CONFIG_DIR` env var overrides the platform default; tests use
 * this for isolation against the user's real `~/.config/cora/`.
 *
 * `CHROMIUM_DIR` is where Playwright is told to install Chromium (via
 * `PLAYWRIGHT_BROWSERS_PATH`). Keeping it under our config dir avoids
 * polluting the user's `~/.cache/ms-playwright/`.
 */
import { join } from 'node:path';

import envPaths from 'env-paths';

function resolveConfigDir(): string {
  const override = process.env.CORA_CONFIG_DIR;
  if (override) return override;
  if (process.platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA;
    if (localAppData) return join(localAppData, 'cora');
    // Fallback: env-paths cache on Windows when LOCALAPPDATA is unset.
    return join(envPaths('cora', { suffix: '' }).cache);
  }
  return join(process.env.HOME ?? '~', '.config', 'cora');
}

export const CORA_CONFIG_DIR = resolveConfigDir();
export const CHROMIUM_DIR = join(CORA_CONFIG_DIR, 'browsers');
