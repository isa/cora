import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { sharedPreviewLayout } from '../../src/preview/components/WorkbenchCanvas.js';
import { computeNodeBox } from '../../src/preview/geometry.js';
import { autoLayoutWorkbenchState, deserializeWorkbenchState } from '../../src/preview/persistence.js';
import type { WorkbenchState } from '../../src/preview/state.js';

const here = dirname(fileURLToPath(import.meta.url));
const infraPath = join(here, '../../../../examples/valid/infra.yaml');

describe('infra.yaml renders orthogonally in the preview', () => {
  it('every edge is orthogonal and its endpoints touch the drawn node boxes', async () => {
    const content = readFileSync(infraPath, 'utf8');
    const result = await deserializeWorkbenchState('infra.yaml', content);
    expect('state' in result).toBe(true);
    if (!('state' in result)) {
      return;
    }
    assertOrthogonalConnected(result.state);

    // The "auto-layout" button must also yield an orthogonally-routable scene.
    const relaidOut = await autoLayoutWorkbenchState(result.state);
    assertOrthogonalConnected(relaidOut);
  });
});

function assertOrthogonalConnected(state: WorkbenchState): void {
    const layout = sharedPreviewLayout(state)!;
    expect(layout).toBeTruthy();

    const tolerance = 1.5;
    for (const [index, edge] of layout.edges.entries()) {
      // 1) Orthogonality: every segment is axis-aligned.
      for (let i = 1; i < edge.points.length; i++) {
        const dx = Math.abs(edge.points[i]!.x - edge.points[i - 1]!.x);
        const dy = Math.abs(edge.points[i]!.y - edge.points[i - 1]!.y);
        expect(
          dx < tolerance || dy < tolerance,
          `edge ${index} (${edge.from}->${edge.to}) segment ${i} is diagonal: dx=${dx} dy=${dy}`,
        ).toBe(true);
      }

      // 2) Endpoints sit on the box the canvas actually draws. infra.yaml is all
      // box components, so the anchor box is the node box itself.
      const connection = state.connections[index]!;
      const fromBox = computeNodeBox(state, connection.fromNodeId)!;
      const toBox = computeNodeBox(state, connection.toNodeId)!;
      const start = edge.points[0]!;
      const end = edge.points.at(-1)!;
      expect(
        onPerimeter(start, fromBox, 2),
        `edge ${index} start ${JSON.stringify(start)} not on ${JSON.stringify(fromBox)}`,
      ).toBe(true);
      expect(
        onPerimeter(end, toBox, 2),
        `edge ${index} end ${JSON.stringify(end)} not on ${JSON.stringify(toBox)}`,
      ).toBe(true);
    }
}

function onPerimeter(
  p: { x: number; y: number },
  box: { x: number; y: number; width: number; height: number },
  tol: number,
): boolean {
  const withinY = p.y >= box.y - tol && p.y <= box.y + box.height + tol;
  const withinX = p.x >= box.x - tol && p.x <= box.x + box.width + tol;
  const onLR = Math.abs(p.x - box.x) <= tol || Math.abs(p.x - (box.x + box.width)) <= tol;
  const onTB = Math.abs(p.y - box.y) <= tol || Math.abs(p.y - (box.y + box.height)) <= tol;
  return (withinY && onLR) || (withinX && onTB);
}
