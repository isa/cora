import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { deserializeWorkbenchState, serializeWorkbenchDocument } from '../../src/preview/persistence.js';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../../..');
const shoppingCartPath = join(repoRoot, 'examples/valid/shopping-cart.yaml');

describe('shopping-cart edge labels in preview', () => {
  it('loads edge labels as selectable attached label nodes — the single representation', async () => {
    const input = readFileSync(shoppingCartPath, 'utf8');
    const result = await deserializeWorkbenchState('shopping-cart.yaml', input);

    expect('state' in result).toBe(true);
    if (!('state' in result)) {
      return;
    }

    const attachedLabels = result.state.nodes.filter(
      (node) => node.attachedConnectionId && node.componentId === 'label',
    );
    expect(attachedLabels).toHaveLength(10);
    expect(attachedLabels.map((node) => node.props.text)).toContain('cart API');

    // Edge labels are *only* attached label nodes now: edges never carry a label,
    // so it is never serialized onto an edge (no doubling).
    const document = serializeWorkbenchDocument(result.state);
    expect(document.diagram.edges.every((edge) => !('label' in edge) || edge.label === undefined)).toBe(true);

    const serializedLabelNodes = document.diagram.nodes.filter(
      (node) => node.component === 'label' && typeof node.style?.attachedEdgeIndex === 'number',
    );
    expect(serializedLabelNodes).toHaveLength(10);
    const labelTexts = serializedLabelNodes.map((node) => node.style?.title ?? node.label);
    expect(labelTexts).toContain('cart API');
    expect(labelTexts).toContain('checkout');
  });
});
