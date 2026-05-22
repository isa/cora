# Phase 3 — Deferred Items (out of scope for current plan)

## test:golden pre-existing failures

**Discovered during:** Plan 03-01 Task 1 (vitest install)

**State:** `bun run test:golden` fails all 5 fixtures (`box-arrows`, `flowchart`, `microservice`, `infra`, `database`) reporting `differs from golden (first change near line 1)`.

**Verification:** Stashed all Plan 03-01 changes (only the lockfile + package.json + vitest.config.ts) and re-ran on clean `main` (HEAD `ca57d08`); the same 5/5 failures reproduce. This is **not** caused by Plan 03-01.

**Likely cause:** Phase 2-era goldens drifted vs the current renderer output — likely from one of the Phase 2 / Phase 3.1 roadmap edits or a renderer tweak that wasn't accompanied by a `UPDATE_GOLDEN=1 node tests/render-golden.mjs` baseline refresh.

**Action:** Out of scope for Phase 3 PDF Export. To be addressed either by:
- Refreshing goldens (`UPDATE_GOLDEN=1 node tests/render-golden.mjs`) under a Phase 2-style docs/baseline commit, OR
- The forthcoming Phase 3.1 (Renderer Component Refactor) — that phase already plans renderer work that would invalidate goldens regardless.

Plan 03-01 explicitly does **not** modify renderer output and Task 3 (font helper extraction) is a pure refactor; if the goldens were green before Task 3, they should remain green after. Plan 03-01 should not be blocked by a pre-existing failure unrelated to its scope.
