import { describe, expect, it } from 'vitest';

import { moveNode } from '../../src/preview/drag.js';
import {
  applyConnectionMarkerInsets,
  chooseConnectionSides,
  computeAttachmentSlots,
  computeNodeBox,
  computeConnectionPoints,
  previewNodeSize,
} from '../../src/preview/geometry.js';
import { addNodeToCanvas, createDefaultWorkbenchState, selectCanvasItem } from '../../src/preview/state.js';

describe('preview geometry', () => {
  it('selects left/right and top/bottom connection sides', () => {
    expect(
      chooseConnectionSides(
        { x: 0, y: 0, width: 100, height: 50 },
        { x: 200, y: 10, width: 100, height: 50 },
      ),
    ).toEqual({ sourceSide: 'right', targetSide: 'left' });
    expect(
      chooseConnectionSides(
        { x: 0, y: 0, width: 100, height: 50 },
        { x: 10, y: 160, width: 100, height: 50 },
      ),
    ).toEqual({ sourceSide: 'bottom', targetSide: 'top' });
  });

  it('labels and distributes multiple same-side attachment slots', () => {
    const slots = computeAttachmentSlots(
      { id: 'node-1', x: 0, y: 0, width: 120, height: 80 },
      'top',
      3,
    );

    expect(slots.map((slot) => slot.label)).toEqual(['top-1', 'top-2', 'top-3']);
    expect(new Set(slots.map((slot) => slot.x)).size).toBe(3);
  });

  it('builds explicit line points and moves only the requested selected node', () => {
    const state = addNodeToCanvas(
      addNodeToCanvas(createDefaultWorkbenchState(), 'box', { x: 180, y: 170 }),
      'page',
      { x: 470, y: 170 },
    );
    const points = computeConnectionPoints(state, state.connections[0]!);
    const moved = moveNode(state, state.nodes[1]!.id, { x: 20, y: 10 });

    expect(points.length).toBeGreaterThanOrEqual(2);
    expect(moved.nodes[0]?.position).toEqual(state.nodes[0]?.position);
    expect(moved.nodes[1]?.position).toEqual({ x: 490, y: 180 });
  });

  it('grows node size as text length and lines increase', () => {
    const state = addNodeToCanvas(createDefaultWorkbenchState(), 'box', { x: 0, y: 0 });
    const base = previewNodeSize(state.nodes[0]!);
    const grown = previewNodeSize({
      ...state.nodes[0]!,
      props: {
        ...state.nodes[0]!.props,
        title: 'A very long service label that should increase width\nLine 2\nLine 3\nLine 4',
      },
    });

    expect(grown.width).toBeGreaterThan(base.width);
    expect(grown.height).toBeGreaterThan(base.height);
  });

  it('grows node size for subtitle text and text-size controls', () => {
    const state = addNodeToCanvas(createDefaultWorkbenchState(), 'box', { x: 0, y: 0 });
    const base = previewNodeSize(state.nodes[0]!);
    const grown = previewNodeSize({
      ...state.nodes[0]!,
      props: {
        ...state.nodes[0]!.props,
        subtitle: 'Another thing that fits the border',
        subtitleFontSize: 28,
      },
    });

    expect(grown.width).toBeGreaterThan(base.width);
    expect(grown.height).toBeGreaterThan(base.height);
  });

  it('scales icon glyph by preset and reserves space for title and subtitle', () => {
    const iconState = addNodeToCanvas(createDefaultWorkbenchState(), 'icon', { x: 0, y: 0 });
    const labelIconState = addNodeToCanvas(createDefaultWorkbenchState(), 'labelIcon', { x: 0, y: 0 });

    const md = previewNodeSize(iconState.nodes[0]!);
    const sm = previewNodeSize({
      ...iconState.nodes[0]!,
      props: { ...iconState.nodes[0]!.props, size: 'sm' },
    });
    const lg = previewNodeSize({
      ...iconState.nodes[0]!,
      props: { ...iconState.nodes[0]!.props, size: 'lg' },
    });

    expect(md.height).toBeGreaterThan(48);
    expect(sm.height).toBeLessThan(md.height);
    expect(lg.height).toBeGreaterThan(md.height);
    expect(sm.height).toBe(md.height - 24);
    expect(lg.height).toBe(md.height + 24);
    expect(
      previewNodeSize({
        ...labelIconState.nodes[0]!,
        props: { ...labelIconState.nodes[0]!.props, size: 'lg' },
      }).width,
    ).toBeGreaterThan(
      previewNodeSize({
        ...labelIconState.nodes[0]!,
        props: { ...labelIconState.nodes[0]!.props, size: 'sm' },
      }).width,
    );
  });

  it('centers attached labels on their connection path', () => {
    const connected = addNodeToCanvas(
      addNodeToCanvas(createDefaultWorkbenchState(), 'box', { x: 100, y: 100 }),
      'page',
      { x: 420, y: 100 },
    );
    const state = addNodeToCanvas(
      { ...connected, selected: { kind: 'connection', id: connected.connections[0]!.id } },
      'label',
      { x: 0, y: 0 },
    );
    const label = state.nodes.at(-1)!;
    const box = computeNodeBox(state, label.id)!;

    expect(label.attachedConnectionId).toBe(connected.connections[0]!.id);
    expect(box.x + box.width / 2).toBeGreaterThan(250);
    expect(box.x + box.width / 2).toBeLessThan(450);
  });

  it('places attached label-icon nodes near the source side of the connection', () => {
    const connected = addNodeToCanvas(
      addNodeToCanvas(createDefaultWorkbenchState(), 'box', { x: 100, y: 100 }),
      'page',
      { x: 420, y: 100 },
    );
    const state = addNodeToCanvas(
      { ...connected, selected: { kind: 'connection', id: connected.connections[0]!.id } },
      'labelIcon',
      { x: 0, y: 0 },
    );
    const labelIcon = state.nodes.at(-1)!;
    const source = computeNodeBox(state, connected.nodes[0]!.id)!;
    const box = computeNodeBox(state, labelIcon.id)!;

    expect(labelIcon.attachedConnectionId).toBe(connected.connections[0]!.id);
    expect(box.x + box.width / 2).toBeGreaterThan(source.x + source.width);
    expect(box.x + box.width / 2).toBeLessThan(source.x + source.width + 60);
  });

  it('anchors icon-node connections to the glyph instead of the title/subtitle bounds', () => {
    const state = addNodeToCanvas(
      addNodeToCanvas(createDefaultWorkbenchState(), 'box', { x: 100, y: 120 }),
      'icon',
      { x: 420, y: 120 },
    );
    const icon = state.nodes.at(-1)!;
    const iconBox = computeNodeBox(state, icon.id)!;
    const points = computeConnectionPoints(state, state.connections[0]!);
    const target = points.at(-1)!;

    expect(iconBox.height).toBeGreaterThan(48);
    expect(target.y).toBe(icon.position.y + 24);
    expect(target.y).toBeLessThan(iconBox.y + iconBox.height / 2);
  });

  it('distributes same-side connection anchors across unique points', () => {
    const connected = addNodeToCanvas(
      addNodeToCanvas(
        createDefaultWorkbenchState(),
        'box',
        { x: 100, y: 100 },
      ),
      'page',
      { x: 420, y: 80 },
    );
    const state = addNodeToCanvas(
      selectCanvasItem(connected, { kind: 'node', id: connected.nodes[0]!.id }),
      'icon',
      { x: 430, y: 220 },
    );
    const first = computeConnectionPoints(state, state.connections[0]!)[0]!;
    const second = computeConnectionPoints(state, state.connections[1]!)[0]!;

    expect(first.x).toBe(second.x);
    expect(first.y).not.toBe(second.y);
  });

  it('pulls arrow marker endpoints back so the arrow can reach the node border', () => {
    const points = [
      { x: 0, y: 20 },
      { x: 80, y: 20 },
      { x: 120, y: 20 },
    ];
    const visible = applyConnectionMarkerInsets(points, {
      startMarker: 'none',
      endMarker: 'arrow',
      arrowSize: 10,
    });

    expect(visible.at(-1)).toEqual({ x: 110, y: 20 });
  });

  it('pulls circle marker endpoints back so the shaft does not show through marker bodies', () => {
    const points = [
      { x: 0, y: 20 },
      { x: 100, y: 20 },
    ];
    const visible = applyConnectionMarkerInsets(points, {
      startMarker: 'circle',
      endMarker: 'filledCircle',
      arrowSize: 10,
    });

    expect(visible[0]!.x).toBeCloseTo(4.35, 2);
    expect(visible[0]!.y).toBe(20);
    expect(visible.at(-1)!.x).toBeCloseTo(96.4, 2);
    expect(visible.at(-1)!.y).toBe(20);
  });
});
