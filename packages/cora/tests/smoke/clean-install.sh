#!/usr/bin/env bash
#
# Phase 3 smoke test: assert `npm install cora` does NOT download
# Chromium (EXP-05). Plan 04 implements the real body — clean container,
# `npm install`, assert `~/.cache/ms-playwright` absent and that the
# cora cache dir at `$HOME/.config/cora/browsers/` is also absent until
# the user invokes `--quality=high`.
#
# Wave 0: stub only. Exits 0 so the smoke lane is non-crashing.
set -euo pipefail

echo "TODO: implement clean-install Chromium-absence assertion in Plan 04"
exit 0
