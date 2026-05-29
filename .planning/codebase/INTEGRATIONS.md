# External Integrations

**Analysis Date:** 2026-05-29

## APIs & External Services

**Iconify API:**
- Integration status: Offline-Only. No active API requests are performed at runtime.
- Icon data is resolved statically from the bundled `@iconify-json/material-symbols` and `@iconify-json/basil` collections in `src/core/iconify.ts`.
- Sub-attributes validation and icon matching happen entirely in-memory using `@iconify/utils`.

**Playwright Browser Downloader:**
- Integration: Lazy Chromium browser downloader for vector PDF rendering (`--quality=high`).
- Implementation: Installs Chromium via `playwright` CLI wrapper triggered by `src/cli/playwrightInstall.ts`.
- Storage directory: Resolved to `CHROMIUM_DIR` (`$HOME/.config/cora/browsers/` on macOS/Linux and `%LOCALAPPDATA%\cora\browsers\` on Windows).
- Consent gating: Controlled by `--yes` flag or `CORA_AUTO_INSTALL=1` environment variable.

## Data Storage

**Databases:**
- None. Cora is a stateless CLI and library. All state is stored in files on the local filesystem.

**File Storage:**
- Input/Output filesystem operations via standard Node.js `fs` APIs (reading diagram specs and writing SVG/PDF/PNG/TXT files).

## Authentication & Identity

- None. There are no authentication requirements or external user databases in Cora.

## Monitoring & Observability

- No tracking or monitoring integrations (no telemetry, no analytics, no remote error trackers). Node.js process exits with structured JSON array outputs on validation and layout error events.

## CI/CD & Deployment

**CI Pipeline:**
- GitHub Actions workflows (`.github/workflows/ci.yml`) - Runs typechecks, unit tests, and regression tests on every push.
- Stub integration: `CORA_TEST_PLAYWRIGHT_INSTALL_STUB` mocks the Playwright installation script for testing environments to avoid multi-megabyte downloads.

## Environment Configuration

**Development:**
- `CORA_CONFIG_DIR`: Overrides the default platform configuration folder directory (used to isolate test environment runs).
- `CORA_TEST_PLAYWRIGHT_INSTALL_STUB`: Mocks Chromium installation script for testing pipeline execution.

**Production:**
- Standard CLI operations. Requires permissions to write to standard filesystem output paths specified by `-o` / `--output`.

## Webhooks & Callbacks

- None. No webhooks or HTTP callbacks are integrated.

---

*Integration audit: 2026-05-29*
*Update when adding/removing external services*
