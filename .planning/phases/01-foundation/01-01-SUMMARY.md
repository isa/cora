---
phase: 01-foundation
plan: 01
subsystem: infra
tags: [bun, turbo, tsdown, ajv, yaml, commander, cli]

requires: []
provides:
  - Bun monorepo with packages/cora publish target
  - YAML/JSON parse pipeline
  - Minimal JSON Schema validation (version: 1)
  - cora validate and cora schema CLI commands
affects: [01-02, 01-03, phase-2-renderer]

tech-stack:
  added: [bun, turbo, tsdown, yaml, ajv, ajv-formats, commander, picocolors]
  patterns: [core module boundary, TTY-aware CLI output routing]

key-files:
  created:
    - packages/cora/src/core/parser.ts
    - packages/cora/src/core/validator.ts
    - packages/cora/src/core/schema/diagram.schema.json
    - packages/cora/src/cli/commands/validate.ts
    - packages/cora/src/cli/commands/schema.ts
    - packages/cora/src/cli/output.ts
  modified:
    - package.json
    - packages/cora/package.json

key-decisions:
  - "Bun workspaces instead of pnpm (user preference)"
  - "tsdown 0.22 for rolldown 1.x compatibility"

patterns-established:
  - "StructuredError { code, path, message, suggestion? } error model"
  - "isJsonOutput: --format json OR non-TTY stdout"

requirements-completed: [SPEC-03, SPEC-05, CLI-01, CLI-04]

duration: n/a
completed: 2026-05-21
---

# Phase 1 Plan 01 Summary

**Walking skeleton: Bun monorepo builds, parses YAML, validates version:1, exposes cora validate + cora schema**

## Performance

- **Duration:** n/a (implemented in prior session, closed out 2026-05-21)
- **Tasks:** 3
- **Files modified:** 20+

## Accomplishments

- Greenfield monorepo with `packages/cora` single publish target
- Core parse (yaml/json) and AJV schema validation
- CLI `validate` and `schema` with TTY/JSON output routing
- Minimal and invalid example fixtures

## Task Commits

Consolidated in `89f4dca` (Finished first phase) and `6891725` (Moved to bun):

1. **Task 1: Monorepo scaffold** — `89f4dca`
2. **Task 2: Core parser and validator** — `89f4dca`
3. **Task 3: CLI validate + schema** — `89f4dca`

## Deviations from Plan

- **Package manager:** Bun workspaces used instead of pnpm (user decision)
- **tsdown:** Upgraded to 0.22.0 to fix rolldown `define` warnings; `fixedExtension: false` for `.js` output

## Issues Encountered

None blocking — tsdown/rolldown version mismatch resolved during Bun migration.

## Next Phase Readiness

Core validate/schema path ready for full v1 schema expansion (plan 02).

---
*Phase: 01-foundation*
*Completed: 2026-05-21*
