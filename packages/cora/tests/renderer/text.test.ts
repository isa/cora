import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, describe, expect, it } from 'vitest';

import {
  applyNodeStyles,
  computeLayout,
  measureNodes,
  parseFile,
  resolveTheme,
  terminateElkWorker,
  validateDocument,
} from '../../src/core/index.js';
import type { Diagram } from '../../src/core/types.js';
import { renderToText } from '../../src/renderer/renderToText.js';
import { renderToTextFromSvg } from '../../src/renderer/renderToTextFromSvg.js';
import { defaultTheme } from '../../src/renderer/themes/default.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '../../../..');

async function buildLayouted(fixture: string) {
  const file = join(repoRoot, 'examples/valid', fixture);
  const parsed = await parseFile(file);
  const errors = validateDocument(parsed.document);
  expect(errors).toEqual([]);
  const doc = parsed.document as { version: 1; diagram: Diagram };
  const { nodeStyles, theme } = resolveTheme(doc.diagram, defaultTheme);
  const measured = applyNodeStyles(measureNodes(doc.diagram.nodes), nodeStyles);
  return computeLayout({
    diagram: doc.diagram,
    measuredNodes: measured,
    theme,
  });
}

describe('renderToText', () => {
  afterAll(async () => {
    await terminateElkWorker();
  });

  it('renders Unicode box drawing by default', async () => {
    const layouted = await buildLayouted('minimal.yaml');
    const output = renderToText(layouted);

    expect(output).toContain('API');
    expect(output).toContain('Database');
    expect(output).toMatch(/[┌┐└┘─│]/u);
    expect(output).not.toMatch(/\u001b\[/u);
  });

  it('renders explicit ASCII output', async () => {
    const layouted = await buildLayouted('minimal.yaml');
    const output = renderToText(layouted, { charset: 'ascii' });

    expect(output).toContain('API');
    expect(output).toContain('Database');
    expect(output).toContain('+');
    expect(output).toContain('-');
    expect(output).toContain('|');
    expect(output).not.toMatch(/[┌┐└┘─│]/u);
  });

  it('is deterministic for repeated calls with the same layouted input', async () => {
    const layouted = await buildLayouted('box-arrows.yaml');

    expect(renderToText(layouted)).toBe(renderToText(layouted));
    expect(renderToText(layouted, { charset: 'ascii' })).toBe(
      renderToText(layouted, { charset: 'ascii' }),
    );
  });

  it.each([
    ['box-arrows.yaml', 'Client'],
    ['flowchart.yaml', 'Valid?'],
    ['microservice.yaml', 'API Gateway'],
    ['infra.yaml', 'Global DNS'],
    ['database.yaml', 'Application'],
  ])('renders %s without throwing', async (fixture, expectedLabel) => {
    const layouted = await buildLayouted(fixture);

    expect(() => renderToText(layouted)).not.toThrow();
    expect(renderToText(layouted)).toContain(expectedLabel);
  });

  it.each([
    'minimal.yaml',
    'box-arrows.yaml',
    'flowchart.yaml',
    'database.yaml',
    'infra.yaml',
    'microservice.yaml',
  ])('matches snapshot for %s', async (fixture) => {
    const layouted = await buildLayouted(fixture);
    const output = renderToText(layouted);
    expect(output).toMatchSnapshot();
  });
});

describe('renderToTextFromSvg', () => {
  it('renders Unicode box drawing by default', async () => {
    const layouted = await buildLayouted('minimal.yaml');
    const output = renderToTextFromSvg(layouted);

    expect(output).toContain('API');
    expect(output).toContain('Database');
    expect(output).toMatch(/[┌┐└┘─│]/u);
  });

  it('renders explicit ASCII output', async () => {
    const layouted = await buildLayouted('minimal.yaml');
    const output = renderToTextFromSvg(layouted, { charset: 'ascii' });

    expect(output).toContain('API');
    expect(output).toContain('Database');
    expect(output).toContain('+');
    expect(output).toContain('-');
    expect(output).toContain('|');
    expect(output).not.toMatch(/[┌┐└┘─│]/u);
  });

  it('uses solid triangular arrowheads in Unicode mode', async () => {
    const layouted = await buildLayouted('minimal.yaml');
    const output = renderToTextFromSvg(layouted, { charset: 'unicode' });

    expect(output).toContain('▼');
    expect(output).not.toMatch(/[↓v]/u);
  });

  it('does not draw any junction stems or spikes on the borders', async () => {
    const layouted = await buildLayouted('minimal.yaml');
    const output = renderToTextFromSvg(layouted, { charset: 'unicode' });

    // The vertical line should touch the clean box borders without junction characters
    expect(output).not.toContain('┴');
    expect(output).not.toContain('┬');
    expect(output).not.toContain('┼');
  });

  it.each([
    'minimal.yaml',
    'box-arrows.yaml',
    'flowchart.yaml',
    'database.yaml',
    'infra.yaml',
    'microservice.yaml',
  ])('matches snapshot for %s', async (fixture) => {
    const layouted = await buildLayouted(fixture);
    const output = renderToTextFromSvg(layouted);
    expect(output).toMatchSnapshot();
  });
});

