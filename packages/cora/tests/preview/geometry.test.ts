import { describe, expect, it } from 'vitest';

import { moveNode } from '../../src/preview/drag.js';
import {
  applyConnectionMarkerInsets,
  chooseConnectionSides,
  computeAttachmentSlots,
  computeNodeBox,
  computeConnectionPoints,
  computeSceneAttachmentSlots,
  nodeResizeCenter,
  positionForResizeAnchor,
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
      'document',
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

  it('wraps non-box node text by growing height instead of width', () => {
    const state = addNodeToCanvas(createDefaultWorkbenchState(), 'document', { x: 0, y: 0 });
    const base = previewNodeSize(state.nodes[0]!);
    const grown = previewNodeSize({
      ...state.nodes[0]!,
      props: {
        ...state.nodes[0]!.props,
        title: 'A very long document title that should wrap to new lines without stretching the node width',
      },
    });

    expect(grown.width).toBe(base.width);
    expect(grown.height).toBeGreaterThan(base.height);
  });

  it('wraps label text by growing height from the default label width', () => {
    const state = addNodeToCanvas(createDefaultWorkbenchState(), 'label', { x: 0, y: 0 });
    const base = previewNodeSize(state.nodes[0]!);
    const grown = previewNodeSize({
      ...state.nodes[0]!,
      props: {
        ...state.nodes[0]!.props,
        title: 'A long attached label that should wrap across multiple lines instead of widening indefinitely',
      },
    });

    expect(grown.width).toBe(base.width);
    expect(grown.height).toBeGreaterThan(base.height);
  });

  it('keeps icon and label-icon size presets proportional and aligned', () => {
    const iconState = addNodeToCanvas(createDefaultWorkbenchState(), 'icon', { x: 0, y: 0 });
    const labelIconState = addNodeToCanvas(createDefaultWorkbenchState(), 'labelIcon', { x: 0, y: 0 });

    expect(previewNodeSize(iconState.nodes[0]!)).toEqual({ width: 96, height: 96 });
    expect(previewNodeSize({
      ...iconState.nodes[0]!,
      props: { ...iconState.nodes[0]!.props, size: 'sm' },
    })).toEqual({ width: 48, height: 48 });
    expect(previewNodeSize({
      ...labelIconState.nodes[0]!,
      props: { ...labelIconState.nodes[0]!.props, size: 'lg' },
    })).toEqual({ width: 96, height: 96 });
  });

  it('centers labelIcon vertical alignment based on the icon itself', () => {
    const state = addNodeToCanvas(
      addNodeToCanvas(createDefaultWorkbenchState(), 'box', { x: 100, y: 100 }),
      'box',
      { x: 300, y: 100 },
    );
    const withLabelIcon = addNodeToCanvas(
      { ...state, selected: { kind: 'connection', id: state.connections[0]!.id } },
      'labelIcon',
      { x: 0, y: 0 },
    );
    const node = withLabelIcon.nodes.at(-1)!;
    const box = computeNodeBox(withLabelIcon, node.id)!;
    // Centred on the connection line between the two compact boxes.
    expect(box.y).toBe(74.5);
  });

  it('centers attached labels on their connection path', () => {
    const connected = addNodeToCanvas(
      addNodeToCanvas(createDefaultWorkbenchState(), 'box', { x: 100, y: 100 }),
      'document',
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

  it('places attached label-icon nodes near the source side of the connection when dropped there', () => {
    const connected = addNodeToCanvas(
      addNodeToCanvas(createDefaultWorkbenchState(), 'box', { x: 100, y: 100 }),
      'document',
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
    expect(box.x + box.width / 2).toBeLessThan(source.x + source.width + 128);
  });

  it('places attached label-icon nodes near the destination side of the connection when dropped there', () => {
    const connected = addNodeToCanvas(
      addNodeToCanvas(createDefaultWorkbenchState(), 'box', { x: 100, y: 100 }),
      'document',
      { x: 420, y: 100 },
    );
    const target = computeNodeBox(connected, connected.nodes[1]!.id)!;
    const state = addNodeToCanvas(
      { ...connected, selected: { kind: 'connection', id: connected.connections[0]!.id } },
      'labelIcon',
      { x: target.x - 40, y: target.y + target.height / 2 - 20 },
    );
    const labelIcon = state.nodes.at(-1)!;
    const box = computeNodeBox(state, labelIcon.id)!;

    expect(labelIcon.attachedConnectionId).toBe(connected.connections[0]!.id);
    expect(box.x + box.width / 2).toBeLessThan(target.x);
    expect(box.x + box.width / 2).toBeGreaterThan(target.x - 128);
  });

  it('distributes same-side connection anchors across unique points', () => {
    const connected = addNodeToCanvas(
      addNodeToCanvas(
        createDefaultWorkbenchState(),
        'box',
        { x: 100, y: 100 },
      ),
        'document',
      { x: 420, y: 80 },
    );
    const state = addNodeToCanvas(
      selectCanvasItem(connected, { kind: 'node', id: connected.nodes[0]!.id }),
      'app',
      { x: 430, y: 220 },
    );
    const first = computeConnectionPoints(state, state.connections[0]!)[0]!;
    const second = computeConnectionPoints(state, state.connections[1]!)[0]!;

    expect(first.x).toBe(second.x);
    expect(first.y).not.toBe(second.y);
  });

  it('distributes icon node side anchors across the icon artwork, centered as the count changes', () => {
    const withIcon = addNodeToCanvas(createDefaultWorkbenchState(), 'icon', { x: 100, y: 100 });
    const twoConnections = addNodeToCanvas(
      selectCanvasItem(
        addNodeToCanvas(
          selectCanvasItem(withIcon, { kind: 'node', id: withIcon.nodes[0]!.id }),
          'box',
          { x: 360, y: 80 },
        ),
        { kind: 'node', id: withIcon.nodes[0]!.id },
      ),
      'box',
      { x: 360, y: 220 },
    );
    const twoStarts = twoConnections.connections.map((connection) =>
      computeConnectionPoints(twoConnections, connection)[0]!,
    );

    expect(twoStarts.map((point) => point.x)).toEqual([176, 176]);
    expect(twoStarts.map((point) => point.y)).toEqual([124.66666666666666, 143.33333333333331]);
    expect((twoStarts[0]!.y + twoStarts[1]!.y) / 2).toBe(134);

    const threeConnections = addNodeToCanvas(
      selectCanvasItem(twoConnections, { kind: 'node', id: withIcon.nodes[0]!.id }),
      'box',
      { x: 360, y: 150 },
    );
    const threeStarts = threeConnections.connections.map((connection) =>
      computeConnectionPoints(threeConnections, connection)[0]!,
    );

    expect(threeStarts.map((point) => point.y).sort((a, b) => a - b)).toEqual([120, 134, 148]);
    expect(threeStarts[0]!.y).toBeLessThan(threeStarts[2]!.y);
    expect(threeStarts[2]!.y).toBeLessThan(threeStarts[1]!.y);
  });

  it('centers analytics side anchors on the chart artwork instead of artwork plus text', () => {
    const withAnalytics = addNodeToCanvas(createDefaultWorkbenchState(), 'analytics', { x: 100, y: 100 });
    const state = addNodeToCanvas(
      selectCanvasItem(withAnalytics, { kind: 'node', id: withAnalytics.nodes[0]!.id }),
      'box',
      { x: 360, y: 100 },
    );
    const start = computeConnectionPoints(state, state.connections[0]!)[0]!;

    expect(start.x).toBe(176);
    expect(start.y).toBe(136.5);
  });

  it('centers configuration side anchors on the settings artwork instead of artwork plus text', () => {
    const withConfiguration = addNodeToCanvas(createDefaultWorkbenchState(), 'configuration', { x: 100, y: 100 });
    const state = addNodeToCanvas(
      selectCanvasItem(withConfiguration, { kind: 'node', id: withConfiguration.nodes[0]!.id }),
      'box',
      { x: 360, y: 100 },
    );
    const start = computeConnectionPoints(state, state.connections[0]!)[0]!;

    expect(start.x).toBe(176);
    expect(start.y).toBe(136.5);
  });

  it('centers cloud side anchors on the cloud artwork instead of artwork plus text', () => {
    const withCloud = addNodeToCanvas(createDefaultWorkbenchState(), 'cloud', { x: 100, y: 100 });
    const state = addNodeToCanvas(
      selectCanvasItem(withCloud, { kind: 'node', id: withCloud.nodes[0]!.id }),
      'box',
      { x: 360, y: 100 },
    );
    const start = computeConnectionPoints(state, state.connections[0]!)[0]!;

    expect(start.x).toBe(176);
    expect(start.y).toBe(136.5);
  });

  it('centers archive side anchors on the box artwork instead of artwork plus text', () => {
    const withArchive = addNodeToCanvas(createDefaultWorkbenchState(), 'archive', { x: 100, y: 100 });
    const state = addNodeToCanvas(
      selectCanvasItem(withArchive, { kind: 'node', id: withArchive.nodes[0]!.id }),
      'box',
      { x: 360, y: 100 },
    );
    const start = computeConnectionPoints(state, state.connections[0]!)[0]!;

    expect(start.x).toBe(176);
    expect(start.y).toBe(136.5);
  });

  it('centers artificialIntelligence side anchors on the AI artwork instead of artwork plus text', () => {
    const withAi = addNodeToCanvas(createDefaultWorkbenchState(), 'artificialIntelligence', { x: 100, y: 100 });
    const state = addNodeToCanvas(
      selectCanvasItem(withAi, { kind: 'node', id: withAi.nodes[0]!.id }),
      'box',
      { x: 360, y: 100 },
    );
    const start = computeConnectionPoints(state, state.connections[0]!)[0]!;

    expect(start.x).toBe(176);
    expect(start.y).toBe(136.5);
  });

  it('centers multimedia side anchors on the multimedia artwork instead of artwork plus text', () => {
    const withMultimedia = addNodeToCanvas(createDefaultWorkbenchState(), 'multimedia', { x: 100, y: 100 });
    const state = addNodeToCanvas(
      selectCanvasItem(withMultimedia, { kind: 'node', id: withMultimedia.nodes[0]!.id }),
      'box',
      { x: 360, y: 100 },
    );
    const start = computeConnectionPoints(state, state.connections[0]!)[0]!;

    expect(start.x).toBe(176);
    expect(start.y).toBe(136.5);
  });

  it('centers app side anchors on the phone artwork instead of artwork plus text', () => {
    const withApp = addNodeToCanvas(createDefaultWorkbenchState(), 'app', { x: 100, y: 100 });
    const state = addNodeToCanvas(
      selectCanvasItem(withApp, { kind: 'node', id: withApp.nodes[0]!.id }),
      'box',
      { x: 360, y: 100 },
    );
    const start = computeConnectionPoints(state, state.connections[0]!)[0]!;

    expect(start.x).toBe(176);
    expect(start.y).toBe(136.5);
  });

  it('distributes multiple app side anchors across the phone artwork, centered together', () => {
    const withApp = addNodeToCanvas(createDefaultWorkbenchState(), 'app', { x: 100, y: 100 });
    const twoConnections = addNodeToCanvas(
      selectCanvasItem(
        addNodeToCanvas(
          selectCanvasItem(withApp, { kind: 'node', id: withApp.nodes[0]!.id }),
          'box',
          { x: 360, y: 80 },
        ),
        { kind: 'node', id: withApp.nodes[0]!.id },
      ),
      'box',
      { x: 360, y: 220 },
    );
    const starts = twoConnections.connections.map((connection) =>
      computeConnectionPoints(twoConnections, connection)[0]!,
    );

    expect(starts.map((point) => point.x)).toEqual([176, 176]);
    expect(starts.map((point) => point.y)).toEqual([126.38888888888889, 146.6111111111111]);
    expect((starts[0]!.y + starts[1]!.y) / 2).toBe(136.5);
  });

  it('shows icon node attachment slots on the icon artwork side', () => {
    const withIcon = addNodeToCanvas(createDefaultWorkbenchState(), 'icon', { x: 100, y: 100 });
    const state = addNodeToCanvas(
      selectCanvasItem(
        addNodeToCanvas(
          selectCanvasItem(withIcon, { kind: 'node', id: withIcon.nodes[0]!.id }),
          'box',
          { x: 360, y: 80 },
        ),
        { kind: 'node', id: withIcon.nodes[0]!.id },
      ),
      'box',
      { x: 360, y: 220 },
    );

    const iconSlots = computeSceneAttachmentSlots(state)
      .filter((slot) => slot.nodeId === withIcon.nodes[0]!.id && slot.side === 'right');

    expect(iconSlots.map((slot) => slot.y)).toEqual([124.66666666666666, 143.33333333333331]);
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

  it('pulls marker shafts back by marker shape and size', () => {
    const points = [
      { x: 0, y: 20 },
      { x: 120, y: 20 },
    ];

    expect(applyConnectionMarkerInsets(points, {
      startMarker: 'circle',
      endMarker: 'filledCircle',
      arrowSize: 10,
    })).toEqual([
      { x: 4.35, y: 20 },
      { x: 116.4, y: 20 },
    ]);

    expect(applyConnectionMarkerInsets(points, {
      startMarker: 'diamond',
      endMarker: 'filledSquare',
      arrowSize: 12,
    })).toEqual([
      { x: 6.75, y: 20 },
      { x: 115.68, y: 20 },
    ]);
  });

  it('anchors icon resize to the icon artwork centre, not the text box centre', () => {
    const state = addNodeToCanvas(createDefaultWorkbenchState(), 'icon', { x: 100, y: 100 });
    const node = state.nodes[0]!;
    const withTitle = {
      ...node,
      props: { ...node.props, title: 'Database', subtitle: 'Primary' },
    };
    const stateWithTitle = { ...state, nodes: [{ ...withTitle }] };
    const box = computeNodeBox(stateWithTitle, node.id)!;
    const center = nodeResizeCenter(stateWithTitle, node.id)!;

    expect(center.x).toBeCloseTo(box.x + box.width / 2, 5);
    expect(center.y).toBeLessThan(box.y + box.height / 2);
  });

  it('keeps the resize anchor fixed when repositioning after a scale', () => {
    const state = addNodeToCanvas(createDefaultWorkbenchState(), 'icon', { x: 80, y: 60 });
    const anchor = nodeResizeCenter(state, state.nodes[0]!.id)!;
    const nextSize = { width: 144, height: 144 };
    const position = positionForResizeAnchor(state, state.nodes[0]!.id, anchor, nextSize);
    const resizedState = {
      ...state,
      nodes: [{
        ...state.nodes[0]!,
        props: { ...state.nodes[0]!.props, size: nextSize },
        position,
      }],
    };
    const nextCenter = nodeResizeCenter(resizedState, state.nodes[0]!.id)!;

    expect(nextCenter.x).toBeCloseTo(anchor.x, 5);
    expect(nextCenter.y).toBeCloseTo(anchor.y, 5);
  });
});
