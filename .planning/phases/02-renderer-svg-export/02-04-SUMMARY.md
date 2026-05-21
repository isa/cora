# 02-04 Summary

**Status:** Complete  
**Plan:** Golden SVG regression + render CLI polish + AGENTS.md

## Delivered

- `packages/cora/tests/golden/*.svg` — five kind baselines
- `packages/cora/tests/render-golden.mjs` — normalize + compare; `UPDATE_GOLDEN=1` refresh
- `test:golden` npm script
- Render CLI help documents `-o`; missing `-o` exits non-zero
- Public API: `renderToSVG`, `computeLayout`, `renderDiagram`, `LayoutedDiagram` from package root
- `AGENTS.md` + `README.md` updated for Phase 2

## Verification

- `node tests/render-golden.mjs` — 5/5 pass
- `cora render --help` mentions `-o`

## Self-Check: PASSED
