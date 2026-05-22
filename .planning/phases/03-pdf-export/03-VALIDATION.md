---
phase: 3
slug: pdf-export
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-22
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 2.x (NEW — Wave 0 introduces it; project currently uses bespoke `tests/render-golden.mjs`) |
| **Config file** | `packages/cora/vitest.config.ts` (Wave 0 creates) |
| **Quick run command** | `bun x vitest run packages/cora/tests/pdf/` |
| **Full suite command** | `bun x vitest run && bun run test:golden` |
| **Estimated runtime** | ~30 s (quick), ~90 s (full, default lane), ~3 min (full with `CORA_TEST_PLAYWRIGHT=1`) |

The high-quality Playwright lane is **gated** behind `CORA_TEST_PLAYWRIGHT=1` so default CI does not download Chromium.

---

## Sampling Rate

- **After every task commit:** Run `bun x vitest run packages/cora/tests/pdf/`
- **After every plan wave:** Run `bun x vitest run && bun run test:golden`
- **Before `/gsd:verify-work`:** Full suite green, plus one `CORA_TEST_PLAYWRIGHT=1 bun x vitest run` against the high-quality lane
- **Max feedback latency:** 30 seconds for quick run

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 03-01-* | 01 | 0 | EXP-02–05 | — | N/A | infra | `bun x vitest run` (smoke) | ❌ W0 | ⬜ pending |
| 03-02-* | 02 | 1 | EXP-02 | — | drawText emits selectable text matching SVG positions | integration | `bun x vitest run packages/cora/tests/pdf/render-pdf.test.ts` | ❌ W0 | ⬜ pending |
| 03-02-* | 02 | 1 | EXP-02 | — | fit-to-content + scale-to-fit math | unit | `bun x vitest run packages/cora/tests/pdf/page-size.test.ts` | ❌ W0 | ⬜ pending |
| 03-02-* | 02 | 1 | D-11 | T-03-01 | resvg font warning → non-zero exit in CI | integration | `bun x vitest run packages/cora/tests/pdf/resvg-warning.test.ts` | ❌ W0 | ⬜ pending |
| 03-03-* | 03 | 2 | EXP-03, EXP-04 | T-03-02 | child-process env allowlisted; CHROMIUM_NOT_INSTALLED JSON shape | integration | `bun x vitest run packages/cora/tests/pdf/chromium-prompt.test.ts` | ❌ W0 | ⬜ pending |
| 03-03-* | 03 | 2 | EXP-03 | — | Playwright PDF lane produces valid PDF | integration (gated) | `CORA_TEST_PLAYWRIGHT=1 bun x vitest run packages/cora/tests/pdf/high-quality.test.ts` | ❌ W0 | ⬜ pending |
| 03-04-* | 04 | 3 | EXP-05 | T-03-03 | npm install does NOT download Chromium | CI smoke | `bash packages/cora/tests/smoke/clean-install.sh` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

Plan IDs are placeholders — the planner refines them. Each row maps to a concrete acceptance check the executor must produce.

---

## Wave 0 Requirements

- [ ] `packages/cora/vitest.config.ts` — vitest framework introduction
- [ ] `packages/cora/tests/pdf/page-size.test.ts` — unit stubs for `computePageGeometry` (EXP-02)
- [ ] `packages/cora/tests/pdf/render-pdf.test.ts` — integration stubs for default PDF path (EXP-02)
- [ ] `packages/cora/tests/pdf/resvg-warning.test.ts` — stubs for resvg stderr capture (D-11)
- [ ] `packages/cora/tests/pdf/chromium-prompt.test.ts` — stubs for predicate split + JSON error (EXP-04)
- [ ] `packages/cora/tests/pdf/high-quality.test.ts` — gated stubs for Playwright lane (EXP-03)
- [ ] `packages/cora/tests/smoke/clean-install.sh` — clean-install assertion (EXP-05)
- [ ] `bun add -d vitest pdf-parse` — framework + PDF text extraction
- [ ] `packages/cora/src/renderer/assets/fonts/NotoSans-Regular.ttf` — runtime asset
- [ ] `packages/cora/src/renderer/assets/fonts/NotoSans-SemiBold.ttf` — runtime asset
- [ ] `packages/cora/src/renderer/assets/fonts/SOURCES.md` — TTF provenance documented (Noto Sans OFL 1.1 vendor commit)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Interactive Chromium download prompt UX | EXP-04 | Requires real TTY input; can't easily fake interactive in CI | Run `cora render examples/valid/box-arrows.yaml -o /tmp/out.pdf --quality=high` in a fresh shell with empty `$HOME/.config/cora/browsers/`. Confirm prompt appears, accepting downloads Chromium to the cora cache (not `~/.cache/ms-playwright`), and re-running skips the prompt. |
| Visual PDF fidelity vs SVG | EXP-02 | Visual diff is hard to automate to a meaningful tolerance for arbitrary diagrams | Render the same diagram to `.svg`, `.pdf`, and `.pdf --quality=high`. Open all three; confirm text is selectable, positions visually match within ~1pt, and no font-fallback glyphs appear. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
