import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  autoLayoutWorkbenchState,
  deserializeWorkbenchState,
  serializeWorkbenchDocument,
} from '../../src/preview/persistence.js';
import { addCatalogItemToCanvas, createDefaultWorkbenchState } from '../../src/preview/state.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '../../../..');

describe('preview persistence', () => {
  it('preserves diagram edge labels when loading and saving YAML', async () => {
    const input = readFileSync(join(repoRoot, 'examples/valid/infra.yaml'), 'utf8');
    const result = await deserializeWorkbenchState('infra.yaml', input);

    expect('state' in result).toBe(true);
    if (!('state' in result)) {
      return;
    }

    const labels = result.state.connections.map((connection) => connection.label).filter(Boolean);
    expect(labels).toContain('replicate');
    expect(labels).toContain('private ingress');

    const document = serializeWorkbenchDocument(result.state);
    const edgeLabels = document.diagram.edges.map((edge) => edge.label).filter(Boolean);
    expect(edgeLabels).toContain('replicate');
    expect(edgeLabels).toContain('private ingress');
  });

  it('auto-layout repositions canvas nodes without attached line icons', async () => {
    let state = addCatalogItemToCanvas(createDefaultWorkbenchState(), 'box', { x: 400, y: 300 });
    state = addCatalogItemToCanvas(state, 'box', { x: 40, y: 80 });
    const before = state.nodes.map((node) => ({ id: node.id, ...node.position }));

    const layouted = await autoLayoutWorkbenchState(state);
    const after = layouted.nodes.map((node) => ({ id: node.id, ...node.position }));

    expect(after).not.toEqual(before);
    expect(layouted.nodes).toHaveLength(2);
  });
});
