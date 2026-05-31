# Cora tests

Active tests live here at the repo root of this folder. The suite is being rebuilt from scratch after major renderer and theme changes.

## Legacy

Pre-refactor tests, fixtures, golden SVG baselines, and smoke scripts are archived under `legacy/`. They are excluded from the default `bun run test` run but remain available for reference or one-off runs:

```bash
# Run archived vitest suites (may fail against current code)
bun run test:legacy

# Golden SVG regression (archived baselines)
UPDATE_GOLDEN=1 bun run test:legacy:golden
bun run test:legacy:golden

# Package install smoke (archived)
bash tests/legacy/smoke/clean-install.sh
```
