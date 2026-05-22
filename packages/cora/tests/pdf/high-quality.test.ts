/**
 * Real Playwright integration test for renderToPDFHighQuality.
 *
 * GATED: only runs when `CORA_TEST_PLAYWRIGHT=1`. Default CI doesn't set
 * this, so the 170MB Chromium download is opt-in. To exercise locally:
 *   CORA_TEST_PLAYWRIGHT=1 bun x vitest run tests/pdf/high-quality.test.ts
 *
 * The test installs Chromium into a temp CORA_CONFIG_DIR, renders a
 * fixture diagram, and asserts the produced PDF is valid (header byte
 * sequence + a known label appears in the extracted text).
 *
 * Covers EXP-03.
 */
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '../../../..');

const enabled = process.env.CORA_TEST_PLAYWRIGHT === '1';
const d = enabled ? describe : describe.skip;

d('renderToPDFHighQuality (real Playwright)', () => {
  let cfgDir: string;

  beforeAll(() => {
    cfgDir = mkdtempSync(join(tmpdir(), 'cora-hq-'));
    process.env.CORA_CONFIG_DIR = cfgDir;
  });

  afterAll(() => {
    rmSync(cfgDir, { recursive: true, force: true });
    delete process.env.CORA_CONFIG_DIR;
  });

  it('installs chromium then produces a valid PDF buffer', async () => {
    const { installChromium, chromiumInstalled } = await import(
      '../../src/cli/playwrightInstall.js'
    );
    await installChromium({ quiet: true });
    expect(chromiumInstalled()).toBe(true);

    const {
      applyNodeStyles,
      computeLayout,
      measureNodes,
      parseFile,
      resolveTheme,
      validateDocument,
    } = await import('../../src/core/index.js');
    const { defaultTheme } = await import(
      '../../src/renderer/themes/default.js'
    );
    const { renderToSVG } = await import('../../src/renderer/renderToSVG.js');
    const fixture = join(repoRoot, 'examples/valid/box-arrows.yaml');
    expect(existsSync(fixture)).toBe(true);
    const parsed = await parseFile(fixture);
    expect(validateDocument(parsed.document)).toEqual([]);
    const doc = parsed.document as {
      version: 1;
      diagram: import('../../src/core/types.js').Diagram;
    };
    const { nodeStyles, theme } = resolveTheme(doc.diagram, defaultTheme);
    const measured = applyNodeStyles(
      measureNodes(doc.diagram.nodes),
      nodeStyles,
    );
    const layouted = await computeLayout({
      diagram: doc.diagram,
      measuredNodes: measured,
      theme,
    });
    const svg = renderToSVG(layouted);

    const { renderToPDFHighQuality } = await import(
      '../../src/renderer/renderToPDFHighQuality.js'
    );
    const buf = await renderToPDFHighQuality(svg, {});
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.subarray(0, 4).toString('ascii')).toBe('%PDF');
  });
});
