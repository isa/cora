#!/usr/bin/env bash
#
# Phase 3 smoke test (EXP-05): asserts `npm install cora` does NOT trigger
# a Chromium download. Packs the local package via `npm pack`, installs the
# tarball into an isolated HOME, and asserts the Playwright browser cache
# (`~/.cache/ms-playwright` on Linux/mac, `Library/Caches/ms-playwright`)
# is absent post-install. The `.npmrc` shipped in the published tarball is
# what enforces this (playwright_skip_browser_download=1).
#
set -euo pipefail

PKG_DIR="$(cd "$(dirname "$0")/../../.." && pwd)"      # legacy/smoke -> packages/cora
SMOKE_DIR="$(mktemp -d -t cora-smoke-XXXXXX)"
trap 'rm -rf "$SMOKE_DIR"' EXIT

echo "[smoke] PKG_DIR=$PKG_DIR"
echo "[smoke] SMOKE_DIR=$SMOKE_DIR"

# Build first — `npm pack` packs `dist/` per `files` array.
( cd "$PKG_DIR" && bun run build >/dev/null )

# Pack the local cora package into a tarball.
( cd "$PKG_DIR" && npm_config_cache="$SMOKE_DIR/npm-cache" npm pack --pack-destination "$SMOKE_DIR" >/dev/null )
TARBALL="$(ls "$SMOKE_DIR"/cora-*.tgz | head -1)"
test -n "$TARBALL" || { echo "[smoke] FAIL: no tarball produced"; exit 1; }

# Isolate npm caches + HOME so we observe a clean install side-effect surface.
mkdir -p "$SMOKE_DIR/install"
HOME="$SMOKE_DIR" npm_config_cache="$SMOKE_DIR/npm-cache" \
  npm install --prefix "$SMOKE_DIR/install" "$TARBALL" \
  --no-audit --no-fund \
  >"$SMOKE_DIR/install.log" 2>&1 || {
    echo "[smoke] FAIL: npm install errored"; cat "$SMOKE_DIR/install.log"; exit 1;
  }

# Assertion 1: cora binary is reachable.
test -f "$SMOKE_DIR/install/node_modules/.bin/cora" \
  || { echo "[smoke] FAIL: cora bin not installed"; exit 1; }

# Assertion 2: NO Chromium directory under the isolated HOME.
# Playwright caches Chromium under $HOME/.cache/ms-playwright on Linux,
# $HOME/Library/Caches/ms-playwright on macOS. Either presence is a failure.
if [ -d "$SMOKE_DIR/.cache/ms-playwright" ]; then
  echo "[smoke] FAIL: Chromium downloaded to $SMOKE_DIR/.cache/ms-playwright"
  exit 1
fi
if [ -d "$SMOKE_DIR/Library/Caches/ms-playwright" ]; then
  echo "[smoke] FAIL: Chromium downloaded to $SMOKE_DIR/Library/Caches/ms-playwright"
  exit 1
fi

# Assertion 3: TTF fonts are in the published tarball (required by default
# resvg + pdf-lib lane).
test -f "$SMOKE_DIR/install/node_modules/cora/dist/renderer/assets/fonts/Poppins-Regular.ttf" \
  || { echo "[smoke] FAIL: TTF Poppins Regular missing from published package"; exit 1; }

# Assertion 4: assert the runtime `playwright` package landed in node_modules
# (proof we are actually exercising the Playwright postinstall path — without
# this, the no-Chromium assertion is vacuous).
test -d "$SMOKE_DIR/install/node_modules/playwright" \
  || { echo "[smoke] FAIL: playwright runtime dep not installed; no-Chromium assertion is vacuous"; exit 1; }

# Assertion 5 — preview assets are NOT shipped (dev-only after Phase 3.7)
if [ -d "$SMOKE_DIR/install/node_modules/cora/dist/preview" ]; then
  echo "[smoke] FAIL: dist/preview/ should not exist in published package"
  exit 1
fi
echo "[smoke]   ✓ preview assets correctly excluded from package"

# Assertion 6: agent skill guide ships with the installed package.
test -f "$SMOKE_DIR/install/node_modules/cora/SKILL.md" \
  || { echo "[smoke] FAIL: SKILL.md missing from published package"; exit 1; }
grep -q "## Triggers" "$SMOKE_DIR/install/node_modules/cora/SKILL.md" \
  || { echo "[smoke] FAIL: SKILL.md missing trigger guidance"; exit 1; }

# Note on .npmrc strategy (Plan 03):
#   npm pack INTENTIONALLY strips `.npmrc` from published tarballs (security:
#   prevents credentials leaking and prevents shipped configs from overriding
#   consumer config). Listing `.npmrc` in package.json `files` does NOT change
#   that. Confirmed empirically: tarball contents never include `.npmrc`.
#   EXP-05 still holds because the runtime `playwright` npm package's own
#   postinstall does NOT auto-download Chromium (that is `playwright-core` +
#   `@playwright/test` behavior, or explicit `npx playwright install`). Cora's
#   lazy-install flow (cli/playwrightInstall.ts) is the only Chromium-fetching
#   code path, gated behind `--quality=high` + consent.
#   This script is the load-bearing proof that this remains true.

echo "[smoke] PASS: cora installs cleanly, no Chromium downloaded, fonts, and SKILL.md shipped"
