---
status: passed
phase: 01-foundation
verified: 2026-05-21
---

# Phase 1 Verification — Foundation

**Goal:** Agents can validate YAML diagrams against a published JSON Schema before rendering exists.

## Must-Haves Verified

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Monorepo builds with Bun + Turborepo + tsdown | ✓ | `bun run build` exits 0 |
| 2 | `cora validate --format json` returns structured errors | ✓ | Invalid fixtures emit JSON array with stable codes |
| 3 | `cora schema` exports v1 JSON Schema | ✓ | Five kinds in schema enum |
| 4 | AGENTS.md documents validate workflow | ✓ | AGENTS.md exists with error codes + commands |
| 5 | All five v1 diagram kinds in schema | ✓ | box-arrows, flowchart, microservice, infra, database |

## Plan Verification

### 01-01 Walking skeleton
- [x] `packages/cora/dist/cli.js` exists
- [x] `bun run build` succeeds
- [x] validate invalid → SCHEMA_VIOLATION; valid minimal → exit 0
- [x] schema stdout is valid JSON

### 01-02 Full schema
- [x] All `examples/valid/*.yaml` pass validate
- [x] Schema includes if/then kind branching
- [x] Five distinct kind fixtures

### 01-03 Structured errors
- [x] MISSING_EDGE_TARGET, MISSING_EXTENSION, UNKNOWN_SERVICE producible
- [x] `--format json` on valid file prints `[]`
- [x] Global `--yes` and CORA_AUTO_INSTALL in cli/index.ts

### 01-04 Agent docs
- [x] AGENTS.md ≥80 lines, lists all five error codes
- [x] README links to AGENTS.md, Phase 1 scope honest

## Requirements Traceability

| ID | Status |
|----|--------|
| SPEC-01–06 | ✓ Schema layer |
| CLI-01–04, CLI-08 | ✓ validate/schema/output |
| AGT-01, AGT-03 | ✓ AGENTS.md + error codes |

## Gaps

None — phase goal achieved at foundation layer (no render yet, as scoped).

## Human Verification

None required for Phase 1 (CLI-only, no UI).

---
*Verified: 2026-05-21*
