---
phase: 01-foundation
plan: 03
subsystem: api
tags: [validation, semantic-errors, cli, json-output]

requires:
  - phase: 01-02
    provides: full v1 schema and fixtures
provides:
  - Stable error codes (SCHEMA_VIOLATION, MISSING_EDGE_TARGET, UNKNOWN_SERVICE, MISSING_EXTENSION, PARSE_ERROR)
  - Semantic validation after AJV pass
  - CI-friendly --format json and --yes / CORA_AUTO_INSTALL
affects: [phase-2-renderer, phase-5-extensions]

tech-stack:
  added: []
  patterns: [schema errors first, then semantic; extension stub hard-fails]

key-files:
  created:
    - packages/cora/src/core/errors.ts
    - examples/invalid/missing-edge-target.yaml
    - examples/invalid/unknown-service.yaml
    - examples/invalid/service-without-provider.yaml
  modified:
    - packages/cora/src/core/validator.ts
    - packages/cora/src/cli/output.ts
    - packages/cora/src/cli/commands/validate.ts
    - packages/cora/src/cli/index.ts

key-decisions:
  - "Phase 1 extension resolver always returns not installed (MISSING_EXTENSION)"

patterns-established:
  - "validateDocument combines AJV + runSemanticValidation"
  - "Human TTY output vs JSON array for agents/CI"

requirements-completed: [CLI-01, CLI-02, CLI-03, CLI-08, AGT-03]

duration: n/a
completed: 2026-05-21
---

# Phase 1 Plan 03 Summary

**Structured validation errors with stable codes, semantic checks, and agent-parseable JSON output**

## Accomplishments

- ERROR_CODES catalog and AJV → SCHEMA_VIOLATION mapping
- Semantic validators: edge targets, provider/service/extension rules
- Negative fixtures for all four semantic error codes
- --format json, non-TTY JSON default, global --yes / CORA_AUTO_INSTALL

## Task Commits

Consolidated in `89f4dca` (Finished first phase)

## Deviations from Plan

None — validateDiagram aliased to validateDocument for backward compatibility.

## Verification

- missing-edge-target → MISSING_EDGE_TARGET
- unknown-service → MISSING_EXTENSION
- service-without-provider → UNKNOWN_SERVICE
- All valid fixtures still pass

---
*Phase: 01-foundation*
*Completed: 2026-05-21*
