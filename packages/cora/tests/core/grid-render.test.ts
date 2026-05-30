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
import type { Diagram, DiagramFile } from '../../src/core/types.js';
import { renderToSVG } from '../../src/renderer/renderToSVG.js';
import { renderToText } from '../../src/renderer/renderToText.js';
import { defaultTheme } from '../../src/renderer/themes/default.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '../../../..');

async function layoutFixture(fixture: string) {
  const file = join(repoRoot, 'examples/valid', fixture);
  const parsed = await parseFile(file);
  const errors = validateDocument(parsed.document);
  expect(errors).toEqual([]);
  const doc = parsed.document as DiagramFile;
  const { nodeStyles, theme } = resolveTheme(doc.diagram, defaultTheme);
  const measured = applyNodeStyles(measureNodes(doc.diagram.nodes), nodeStyles);
  return computeLayout({
    diagram: doc.diagram,
    measuredNodes: measured,
    theme,
  });
}

function diagramWithoutGrid(diagram: Diagram): Diagram {
  const { grid: _grid, ...rest } = diagram;
  return rest;
}

describe('grid render boundaries', () => {
  afterAll(async () => {
    await terminateElkWorker();
  });

  it('validates grid-config.yaml', async () => {
    const parsed = await parseFile(join(repoRoot, 'examples/valid/grid-config.yaml'));
    expect(validateDocument(parsed.document)).toEqual([]);
  });

  it('does not render grid patterns in SVG export', async () => {
    const layouted = await layoutFixture('grid-config.yaml');
    const svg = renderToSVG(layouted);
    expect(svg).not.toContain('preview-grid-minor');
    expect(svg).not.toContain('preview-grid-major');
  });

  it('layout positions are identical with and without diagram.grid', async () => {
    const withGrid = await layoutFixture('grid-config.yaml');
    const parsed = await parseFile(join(repoRoot, 'examples/valid/grid-config.yaml'));
    const doc = parsed.document as DiagramFile;
    const withoutGridDiagram = diagramWithoutGrid(doc.diagram);
    const { nodeStyles, theme } = resolveTheme(withoutGridDiagram, defaultTheme);
    const measured = applyNodeStyles(measureNodes(withoutGridDiagram.nodes), nodeStyles);
    const withoutGrid = await computeLayout({
      diagram: withoutGridDiagram,
      measuredNodes: measured,
      theme,
    });

    expect(withoutGrid.nodes.map((n) => ({ id: n.id, x: n.x, y: n.y }))).toEqual(
      withGrid.nodes.map((n) => ({ id: n.id, x: n.x, y: n.y })),
    );
  });

  it('text export is identical with and without diagram.grid', async () => {
    const withGrid = await layoutFixture('grid-config.yaml');
    const parsed = await parseFile(join(repoRoot, 'examples/valid/grid-config.yaml'));
    const doc = parsed.document as DiagramFile;
    const withoutGridDiagram = diagramWithoutGrid(doc.diagram);
    const { nodeStyles, theme } = resolveTheme(withoutGridDiagram, defaultTheme);
    const measured = applyNodeStyles(measureNodes(withoutGridDiagram.nodes), nodeStyles);
    const withoutGrid = await computeLayout({
      diagram: withoutGridDiagram,
      measuredNodes: measured,
      theme,
    });

    expect(renderToText(withGrid)).toBe(renderToText(withoutGrid));
  });
});
