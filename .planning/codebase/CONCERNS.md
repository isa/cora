# Codebase Concerns

**Analysis Date:** 2026-05-29

## Tech Debt

**ELK options version-pinning:**
- Issue: Graph layout options and orthogonal routing behaviors in ELK are highly version-dependent. If `elkjs` is upgraded without strict validation, edge routing visually breaks (edges run diagonally or overlap nodes).
- Why: ELK options are complex and option interactions are unvalidated at the library boundary.
- Impact: Unpinned minor versions can trigger layout regressions.
- Fix approach: Pin `elkjs` to exact minor (`^0.11.1`) and maintain stable visual golden regression baselines.

**Text Measurement without DOM in Headless Render:**
- Issue: Heading, title, and label width calculation relies on font metrics measurements (`src/core/measureText.ts` and `src/core/catalogTextLayout.ts`) rather than browser DOM methods like `getBBox()`.
- Why: head-less CLI executions lack a window or document object.
- Impact: Inaccurate calculations can cause text overflows or edge overlap in final SVGs.
- Fix approach: Keep font metrics files synchronized with actual rendered Noto Sans web fonts used by the SVG components.

## Known Bugs

- None currently identified. Existing visual regressions are guarded by the automated golden check suite (`bun run test:golden`).

## Security Considerations

**Playwright Environment Shell Injection Risk:**
- Risk: Spawning the Playwright CLI installer could allow Node options injection or PATH pollution if environment variables are forwarded without filters.
- Current mitigation: `packages/cora/src/cli/playwrightInstall.ts` specifies a strict allowlist of environment variables (like `PATH`, `HOME`, `HTTPS_PROXY`) when spawning processes, instead of spreading `process.env`.
- Recommendations: Maintain this strict allowlist boundary and do not expand variables exposed to spawned processes.

## Performance Bottlenecks

**ELK Layout Calculations CPU blocking:**
- Problem: Large diagrams (200+ nodes) can lock the event loop during coordinate calculations.
- Cause: ELK layout calculation is a heavy CPU-bound process.
- Improvement path: Run ELK inside Web Workers (configured via `web-worker` inside `packages/cora/src/core/layoutWorker.ts`) to avoid blocking the main server runtime loop during `cora serve`.

## Fragile Areas

**YAML AST Patching in serve mode:**
- Why fragile: Naive parsing and saving operations via `yaml` library can strip user-added comments, collapse custom spacing, or discard unsupported schema fields.
- Common failures: Custom comments, blank lines, or metadata attributes vanish after edits are saved via the preview workbench.
- Safe modification: Modify only target properties (positions, labels) in the AST Document, leaving parent structures unchanged. Validate round-trip saves using tests.

**resvg Font Fallback Warnings:**
- Why fragile: Rust-backed `resvg` fails to load Noto Sans if SVG `<text>` elements are deeply nested inside `<use>` or external SVG groups rather than top-level SVGs.
- Common failures: Text collapses to default system serif fonts or fails to render, triggering `RESVG_FONT_WARNING`.
- Safe modification: Ensure the React components emit `<text>` declarations conforming to resvg font loading constraints.

## Scaling Limits

**Diagram Size Limits:**
- Limit: Diagrams with 300+ nodes or 500+ edges.
- Symptoms: Layout calculation times exceed 5 seconds, and Vite hot-reloading responsiveness degrades.
- Scaling path: Expose strategy parameters (such as `BRANDES_KOEPF` vs `NETWORK_SIMPLEX`) to let users trade compactness for calculation speed.

## Dependencies at Risk

- `@resvg/resvg-js`: Pinned to `~2.6.2` to guarantee pre-compiled binaries compatibility. Bumping this dependency requires careful verification of font warning pipelines.

---

*Concerns audit: 2026-05-29*
*Update as issues are fixed or new ones discovered*
