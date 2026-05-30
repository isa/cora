import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';
import { parse as parseYaml } from 'yaml';

import { computeLayout } from '../../src/core/layout.js';
import { measureNodes } from '../../src/core/measureText.js';
import { applyNodeStyles, resolveTheme } from '../../src/core/themeResolver.js';
import type { DiagramFile } from '../../src/core/types.js';
import { buildPreviewScene } from '../../src/preview/components/WorkbenchCanvas.js';
import {
  autoLayoutWorkbenchState,
  deserializeWorkbenchState,
  serializeWorkbenchDocument,
} from '../../src/preview/persistence.js';
import { addCatalogItemToCanvas, createDefaultWorkbenchState, updateNodeProps } from '../../src/preview/state.js';
import { defaultTheme } from '../../src/renderer/themes/default.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '../../../..');

describe('preview persistence', () => {
  it('preserves diagram edge labels and layout mode when loading and saving YAML', async () => {
    const input = readFileSync(join(repoRoot, 'examples/valid/infra.yaml'), 'utf8');
    const result = await deserializeWorkbenchState('infra.yaml', input);

    expect('state' in result).toBe(true);
    if (!('state' in result)) {
      return;
    }

    expect(result.state.diagramLayout).toBe('auto');

    const labels = result.state.connections.map((connection) => connection.label).filter(Boolean);
    expect(labels).toContain('replicate');
    expect(labels).toContain('private ingress');

    const document = serializeWorkbenchDocument(result.state);
    expect(document.diagram.layout).toBe('auto');
    expect(document.diagram.nodes.every((node) => node.style?.size === undefined)).toBe(true);

    const edgeLabels = document.diagram.edges.map((edge) => edge.label).filter(Boolean);
    expect(edgeLabels).toContain('replicate');
    expect(edgeLabels).toContain('private ingress');
  });

  it('matches the renderer layout exactly when loading database.yaml without edits', async () => {
    const input = readFileSync(join(repoRoot, 'examples/valid/database.yaml'), 'utf8');
    const document = parseYaml(input) as DiagramFile;
    const { nodeStyles, theme } = resolveTheme(document.diagram, defaultTheme);
    const measured = applyNodeStyles(measureNodes(document.diagram.nodes), nodeStyles);
    const renderLayout = await computeLayout({
      diagram: document.diagram,
      measuredNodes: measured,
      theme,
    });
    const result = await deserializeWorkbenchState('database.yaml', input);

    expect('state' in result).toBe(true);
    if (!('state' in result)) {
      return;
    }

    const scene = buildPreviewScene(result.state, 'fast');
    const previewBoxes = Object.fromEntries(
      [...scene.renderedNodeBoxesById.entries()].map(([id, box]) => [id, box]),
    );
    const renderBoxes = Object.fromEntries(
      renderLayout.nodes.map((node) => [
        node.id,
        {
          id: node.id,
          x: node.x,
          y: node.y,
          width: node.measuredWidth,
          height: node.measuredHeight,
        },
      ]),
    );

    expect(previewBoxes).toEqual(renderBoxes);
    expect(
      scene.renderedConnections.map(({ edge }) => edge.points),
    ).toEqual(renderLayout.edges.map((edge) => edge.points));
  });

  it('serializes preview-authored diagrams with explicit visual sizes', () => {
    const state = addCatalogItemToCanvas(createDefaultWorkbenchState(), 'box', { x: 80, y: 64 });

    const document = serializeWorkbenchDocument(state);
    expect(document.diagram.layout).toBe('preserve');
    expect(document.diagram.nodes[0]?.position).toEqual({ x: 80, y: 64 });
    expect(document.diagram.nodes[0]?.style?.size).toEqual({ width: 120, height: 56 });
  });

  it('round-trips node and group fontFamily through YAML', async () => {
    let state = addCatalogItemToCanvas(createDefaultWorkbenchState(), 'label', { x: 40, y: 40 });
    state = updateNodeProps(state, state.nodes[0]!.id, 'fontFamily', 'Montserrat');
    state = {
      ...state,
      groups: [
        {
          id: 'group-1',
          label: 'Services',
          position: { x: 20, y: 20 },
          size: { width: 240, height: 120 },
          fillColor: 'none',
          labelColor: '#0f172a',
          labelSize: 12,
          fontFamily: 'Roboto',
        },
      ],
      diagramLayout: 'preserve',
    };

    const yaml = serializeWorkbenchDocument(state);
    expect(yaml.diagram.nodes[0]?.style?.fontFamily).toBe('Montserrat');
    expect(yaml.diagram.groups[0]?.style?.fontFamily).toBe('Roboto');

    const loaded = await deserializeWorkbenchState('preview.yaml', JSON.stringify(yaml));
    expect('state' in loaded).toBe(true);
    if (!('state' in loaded)) {
      return;
    }

    expect(loaded.state.nodes[0]?.props.fontFamily).toBe('Montserrat');
    expect(loaded.state.groups[0]?.fontFamily).toBe('Roboto');
  });

  it('switches loaded auto-layout files to preserve after preview edits', async () => {
    const input = readFileSync(join(repoRoot, 'examples/valid/infra.yaml'), 'utf8');
    const result = await deserializeWorkbenchState('infra.yaml', input);

    expect('state' in result).toBe(true);
    if (!('state' in result)) {
      return;
    }

    const firstNode = result.state.nodes[0]!;
    const edited = updateNodeProps(result.state, firstNode.id, 'title', `${firstNode.props.title} updated`);
    const document = serializeWorkbenchDocument(edited);

    expect(edited.diagramLayout).toBe('preserve');
    expect(document.diagram.layout).toBe('preserve');
    expect(document.diagram.nodes[0]?.style?.size).toBeDefined();
  });

  it('auto-layout repositions canvas nodes and resets diagramLayout to auto', async () => {
    let state = addCatalogItemToCanvas(createDefaultWorkbenchState(), 'box', { x: 400, y: 300 });
    state = addCatalogItemToCanvas(state, 'box', { x: 40, y: 80 });
    expect(state.diagramLayout).toBe('preserve');
    const before = state.nodes.map((node) => ({ id: node.id, ...node.position }));

    const layouted = await autoLayoutWorkbenchState(state);
    const after = layouted.nodes.map((node) => ({ id: node.id, ...node.position }));

    expect(after).not.toEqual(before);
    expect(layouted.nodes).toHaveLength(2);
    expect(layouted.diagramLayout).toBe('auto');
  });
});
