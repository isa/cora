---
phase: 01-foundation
plan: 02
subsystem: api
tags: [json-schema, ajv, yaml, diagram-kinds]

requires:
  - phase: 01-01
    provides: minimal schema validator and cora schema command
provides:
  - Full v1 JSON Schema with five diagram kinds
  - Per-kind example fixtures
  - getSupportedKinds() helper
affects: [01-03, phase-2-renderer]

tech-stack:
  added: []
  patterns: [layered hybrid schema with if/then kind extensions]

key-files:
  created:
    - examples/valid/box-arrows.yaml
    - examples/valid/flowchart.yaml
    - examples/valid/microservice.yaml
    - examples/valid/infra.yaml
    - examples/valid/database.yaml
  modified:
    - packages/cora/src/core/schema/diagram.schema.json
    - packages/cora/src/core/types.ts
    - packages/cora/src/core/schema.ts

key-decisions:
  - "if/then branching on diagram.kind for kind-specific constraints"

patterns-established:
  - "Shared nodes/edges/groups vocabulary with kind-specific extensions"

requirements-completed: [SPEC-01, SPEC-02, SPEC-04, SPEC-05, SPEC-06, CLI-04]

duration: n/a
completed: 2026-05-21
---

# Phase 1 Plan 02 Summary

**Full v1 JSON Schema covering all five diagram kinds with validating per-kind YAML fixtures**

## Accomplishments

- Expanded schema: version:1, single diagram root, shared nodes/edges/groups
- Kind enum: box-arrows, flowchart, microservice, infra, database
- if/then kind-specific shape constraints
- Five example fixtures under examples/valid/

## Task Commits

Consolidated in `89f4dca` (Finished first phase)

## Deviations from Plan

None — schema uses $defs/diagramBase with allOf if/then per kind.

## Verification

All `examples/valid/*.yaml` pass `cora validate`.

---
*Phase: 01-foundation*
*Completed: 2026-05-21*
