# Phase 3: PDF Export - Context

**Gathered:** 2026-05-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Add `.pdf` output to `cora render -o diagram.pdf`. Two render paths:

- **Default:** resvg + pdf-lib with embedded Noto Sans for selectable text. No browser deps; installs cleanly via `npm install`.
- **`--quality=high`:** Playwright with one-time Chromium download to `$HOME/.config/cora/browsers/`. `--yes` / `CORA_AUTO_INSTALL=1` enables non-interactive install for CI.

Page sizing defaults to fit-to-content (page bbox = diagram bbox + margin). Opt-in `--page=a4|letter|...` for fixed print sizes. CI must fail on resvg font-family warnings.

Out of scope: PNG quality changes (Phase 2 covers PNG), interactive canvas (Phase 4), themes/extensions (Phase 5), `cora doctor` (Phase 6).

</domain>

<decisions>
## Implementation Decisions

### Page sizing
- **D-01:** Default page sizing is **fit-to-content** — PDF page dimensions match the diagram bbox plus a small margin (exact margin value at planner's discretion; suggestion: 24pt). No empty whitespace; consistent across diagram sizes.
- **D-02:** Opt-in `--page=<size>` flag for fixed page sizes (at minimum: `a4`, `letter`, `a4-portrait`, `letter-portrait`). When set, diagram is scaled to fit the chosen page.
- **D-03:** When the diagram is larger than the chosen `--page`, scale-to-fit the single page. Multi-page tiling is **deferred** for v1.

### PDF text fidelity
- **D-04:** Default PDF path must produce **selectable / searchable text**. Use pdf-lib to embed the already-bundled Noto Sans (Regular + SemiBold) and place text objects at SVG text positions, with vector shapes drawn underneath. No rasterized-text fallback for default path.
- **D-05:** Text positions in the PDF must match the SVG output within a tight tolerance (planner picks tolerance; suggestion: ≤1pt). Phase 2 already produces SVG with absolute text coordinates, so reuse the layouted IR rather than re-measuring.
- **D-06:** `--quality=high` Playwright path produces selectable text natively (PDF print of HTML). No special handling beyond launching Chromium against the rendered SVG.

### `--quality=high` failure UX
- **D-07:** When `--quality=high` is requested, Chromium is missing, and the run is non-interactive (no TTY OR `--format=json` OR `CI=1`) AND neither `--yes` nor `CORA_AUTO_INSTALL=1` is set: **hard fail** with exit code ≠ 0.
- **D-08:** The failure message MUST include the actionable install hint: pass `--yes`, set `CORA_AUTO_INSTALL=1`, or run interactively to accept the prompt. JSON output uses a stable error code (planner to assign, e.g. `CHROMIUM_NOT_INSTALLED`).
- **D-09:** No silent fallback to resvg when `--quality=high` fails. The user asked for high quality; producing default quality silently would be a quality regression hidden from CI.
- **D-10:** Interactive TTY path: single prompt asking to download Chromium to `$HOME/.config/cora/browsers/`. Subsequent runs reuse the cached install.

### Resvg font-family warnings
- **D-11:** Resvg font-family warnings during PDF rendering MUST cause a non-zero exit in CI mode (treat as errors). Phase 2 already bundles Noto Sans for resvg; if a font-family warning fires in Phase 3, something regressed.

### Claude's Discretion
- **Exact margin value** for fit-to-content (suggestion: 24pt, planner may adjust).
- **Exact list of supported `--page` values** beyond the minimum a4 / letter / portrait variants — planner may add `a3`, `tabloid`, etc., or defer.
- **Text-position tolerance** between SVG and PDF — D-05 sets the intent, planner picks the number.
- **pdf-lib library choice** — pdf-lib is the named default per ROADMAP; planner may swap if research surfaces a better fit, but selectable-text requirement (D-04) is non-negotiable.
- **CI detection heuristic** — `CI=1` env, no TTY, `--format=json`, etc. Planner to define the full predicate for "non-interactive".
- **Chromium version pinning** — Playwright's bundled-version policy is at the planner's discretion; just needs to be reproducible.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and requirements
- `.planning/ROADMAP.md` — Phase 3 goal, success criteria (resvg+pdf-lib default, Playwright `--quality=high`, Chromium cache path, `--yes` / `CORA_AUTO_INSTALL=1`, resvg font-family warnings = CI failure)
- `.planning/REQUIREMENTS.md` — EXP-02–05 (PDF requirements)
- `.planning/PROJECT.md` — Architecture overview (`cora render .pdf resvg (default) | Playwright (--quality=high)`)

### Carried forward from Phase 2
- `.planning/phases/02-renderer-svg-export/02-CONTEXT.md` — Default theme, Noto Sans bundling (D-05/D-06), SVG output contract
- `.planning/research/PITFALLS.md` — Pitfall 10 (font embedding) directly applies to PDF text
- `.planning/research/STACK.md` — Bundled `@resvg/resvg-js`, Noto Sans assets layout

### Agent contract
- `AGENTS.md` — Phase 3 adds `cora render -o file.pdf` and `--quality=high` to documented CLI; JSON error shape must extend for `CHROMIUM_NOT_INSTALLED` (or equivalent) code

### Code paths to integrate with
- `packages/cora/src/cli/commands/render.ts` — Extend `outputFormat()` for `.pdf`; add `--quality` and `--page` options
- `packages/cora/src/renderer/renderToPNG.ts` — Reference pattern for resvg + bundled-font integration
- `packages/cora/src/renderer/assets/fonts/` — Existing Noto Sans woff files (will need TTF/OTF variants for pdf-lib embedding; planner to verify)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/cora/src/cli/commands/render.ts` already dispatches by file extension (`.svg`, `.png`); add `.pdf` branch.
- `packages/cora/src/renderer/renderToPNG.ts` shows the resvg + bundled-Noto-Sans pattern (font path resolution, scaled SVG dimensions) — reuse the font-loading helper.
- `renderToSVG(layouted)` from Phase 2 produces the pure-SVG string the PDF pipeline consumes — both quality paths start from this string.
- The `--format json` / TTY detection plumbing from Phase 1 (`packages/cora/src/cli/output.ts`) is already in place; reuse for the Chromium prompt vs JSON error split.

### Established Patterns
- Extension-based output format dispatch in `render.ts` (`.svg | .png`) — extend to `.pdf`.
- Bundled-font resolution via `dirname(fileURLToPath(import.meta.url))` with src/dist fallback (see `resolveFontPath` in `renderToPNG.ts`).
- Global `--yes` / `CORA_AUTO_INSTALL=1` semantics established in Phase 1 — Chromium install must honor both.
- Resvg's `fontBuffers` API already wired; `width`/`height` must be set explicitly on the SVG root before rasterization.

### Integration Points
- New `renderToPDF.ts` module in `packages/cora/src/renderer/` — analogous to `renderToPNG.ts` for the default path.
- A separate Playwright wrapper module (e.g. `renderToPDFHighQuality.ts`) for the `--quality=high` path; lazy-loaded so resvg-only users don't pay the import cost.
- `package.json` peer/optional dep strategy for Playwright — planner to decide install topology (`@playwright/test` vs `playwright`, optional vs runtime download).
- Chromium cache dir: `$HOME/.config/cora/browsers/` (Linux/macOS); planner should confirm Windows equivalent (likely `%LOCALAPPDATA%/cora/browsers/`) per `env-paths` or similar.

</code_context>

<specifics>
## Specific Ideas

- PDF target feel: a developer opens it, can **select and copy** the labels (D-04). PRs render diffable PDFs.
- The default path must work after a vanilla `npm install` — no postinstall network calls, no browser binaries. `--quality=high` is the only path that touches the network.
- Agent workflow guarantee: `cora render diagram.yaml -o out.pdf --yes --format json` in CI either produces a valid PDF or returns a structured JSON error with a stable code — never a half-quality silent fallback.

</specifics>

<deferred>
## Deferred Ideas

- **Multi-page tiling** for huge diagrams — single oversized page (fit-to-content) or scale-to-fit covers v1; tiling can come post-v1 if users ask.
- **Custom margin / padding flags** (e.g. `--margin=48`) — planner can choose a sensible default; expose only if users request.
- **PDF metadata** (title, author, subject from diagram metadata) — nice-to-have; out of EXP-02–05 scope.
- **`cora doctor`** Chromium-presence check — belongs in Phase 6.
- **Print-optimized color profile** (CMYK, print-safe palette) — current default theme is screen-RGB; defer unless users print frequently.

</deferred>

---

*Phase: 3-PDF Export*
*Context gathered: 2026-05-22*
