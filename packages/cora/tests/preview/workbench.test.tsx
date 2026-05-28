import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { computePreservedLayout } from '../../src/core/layout.js';
import { measureNodes } from '../../src/core/measureText.js';
import { applyNodeStyles, resolveTheme } from '../../src/core/themeResolver.js';
import { App, shouldFocusSearchFromShortcut } from '../../src/preview/App.js';
import { connectionDefaults } from '../../src/preview/controls/defaults.js';
import { filterComponents } from '../../src/preview/components/CatalogSidebar.js';
import { ControlInput } from '../../src/preview/components/ControlInput.js';
import { GroupPanel } from '../../src/preview/components/GroupPanel.js';
import { previewConnectionPathData, WorkbenchCanvas } from '../../src/preview/components/WorkbenchCanvas.js';
import {
  applyConnectionMarkerInsets,
  computeConnectionPoints,
  computeNodeBox,
  connectionCenter,
  previewNodeSize,
} from '../../src/preview/geometry.js';
import { searchPreviewIcons } from '../../src/preview/iconSearch.js';
import { serializeWorkbenchDocument } from '../../src/preview/persistence.js';
import { addNodeToCanvas, createDefaultWorkbenchState, selectCanvasItem } from '../../src/preview/state.js';
import {
  edgeBridgeMaskPathData,
  edgeLineMarkerPoints,
  edgeLinePathData,
} from '../../src/renderer/components/edges/edgePath.js';
import { defaultTheme } from '../../src/renderer/themes/default.js';

function renderedPreviewLayout(state: ReturnType<typeof createDefaultWorkbenchState>) {
  const document = serializeWorkbenchDocument(state);
  const attachedNodeIds = new Set(
    state.nodes.filter((node) => node.attachedConnectionId).map((node) => node.id),
  );

  document.diagram.nodes = document.diagram.nodes.filter((node) => !attachedNodeIds.has(node.id));
  if (document.diagram.groups) {
    document.diagram.groups = document.diagram.groups
      .map((group) => ({
        ...group,
        contains: group.contains?.filter((nodeId) => !attachedNodeIds.has(nodeId)),
      }))
      .filter((group) => (group.contains?.length ?? 0) > 0);
  }

  const { nodeStyles, theme } = resolveTheme(document.diagram, defaultTheme);
  const layout = computePreservedLayout({
    diagram: document.diagram,
    measuredNodes: applyNodeStyles(measureNodes(document.diagram.nodes), nodeStyles),
    theme,
    offset: false,
  });

  return layout;
}

function renderedConnectionPoints(state: ReturnType<typeof createDefaultWorkbenchState>, index: number) {
  return renderedPreviewLayout(state).edges[index]!.points;
}

function renderedMarkerCarrierPoints(
  state: ReturnType<typeof createDefaultWorkbenchState>,
  index: number,
) {
  const layout = renderedPreviewLayout(state);
  const connection = state.connections[index]!;
  return edgeLineMarkerPoints(layout.edges[index]!, {
    markerSize: connection.props.arrowSize,
  });
}

function renderedShaftPoints(
  state: ReturnType<typeof createDefaultWorkbenchState>,
  index: number,
) {
  return applyConnectionMarkerInsets(
    renderedMarkerCarrierPoints(state, index),
    state.connections[index]!.props,
  );
}

function crossingWorkbenchState() {
  const base = createDefaultWorkbenchState();
  const boxDefaults = base.pack.components.find((component) => component.id === 'box')!.defaultProps;

  return {
    ...base,
    nodes: [
      { id: 'node-1', componentId: 'box', props: { ...boxDefaults }, position: { x: 40, y: 140 } },
      { id: 'node-2', componentId: 'box', props: { ...boxDefaults }, position: { x: 440, y: 140 } },
      { id: 'node-3', componentId: 'box', props: { ...boxDefaults }, position: { x: 240, y: 20 } },
      { id: 'node-4', componentId: 'box', props: { ...boxDefaults }, position: { x: 240, y: 300 } },
    ],
    groups: [],
    connections: [
      { id: 'connection-1', fromNodeId: 'node-1', toNodeId: 'node-2', props: { ...connectionDefaults } },
      { id: 'connection-2', fromNodeId: 'node-3', toNodeId: 'node-4', props: { ...connectionDefaults } },
    ],
    nextId: 5,
  };
}

function renderedNodeBoxFor(
  state: ReturnType<typeof createDefaultWorkbenchState>,
  nodeId: string,
) {
  const renderedNode = renderedPreviewLayout(state).nodes.find((node) => node.id === nodeId);
  if (!renderedNode) {
    return computeNodeBox(state, nodeId);
  }

  return {
    id: renderedNode.id,
    x: renderedNode.x,
    y: renderedNode.y,
    width: renderedNode.measuredWidth,
    height: renderedNode.measuredHeight,
  };
}

function pointOnBoxPerimeter(
  point: { x: number; y: number },
  box: NonNullable<ReturnType<typeof computeNodeBox>>,
  tolerance = 0.5,
) {
  const withinVerticalSpan = point.y >= box.y - tolerance && point.y <= box.y + box.height + tolerance;
  const withinHorizontalSpan = point.x >= box.x - tolerance && point.x <= box.x + box.width + tolerance;
  const onLeftOrRight =
    Math.abs(point.x - box.x) <= tolerance ||
    Math.abs(point.x - (box.x + box.width)) <= tolerance;
  const onTopOrBottom =
    Math.abs(point.y - box.y) <= tolerance ||
    Math.abs(point.y - (box.y + box.height)) <= tolerance;

  return (withinVerticalSpan && onLeftOrRight) || (withinHorizontalSpan && onTopOrBottom);
}

function renderedNodeBoxResolver(
  state: ReturnType<typeof createDefaultWorkbenchState>,
  connectionIndex: number,
) {
  const layout = renderedPreviewLayout(state);
  const connection = state.connections[connectionIndex]!;
  const points = layout.edges[connectionIndex]!.points;
  const center = connectionCenter(points);

  return (nodeId: string) => {
    const node = state.nodes.find((item) => item.id === nodeId);
    if (!node) {
      return undefined;
    }
    if (!node.attachedConnectionId) {
      return renderedNodeBoxFor(state, nodeId);
    }
    if (node.attachedConnectionId !== connection.id || !center) {
      return computeNodeBox(state, nodeId);
    }

    const size = previewNodeSize(node);
    return {
      id: node.id,
      x: center.x - size.width / 2,
      y: center.y - size.height / 2,
      width: size.width,
      height: size.height,
    };
  };
}

describe('preview workbench', () => {
  it('renders catalog, canvas, inspector, and visual shell markers', () => {
    const markup = renderToStaticMarkup(<App />);

    expect(markup).toContain('aria-label="Catalog"');
    expect(markup).toContain('aria-label="Canvas"');
    expect(markup).toContain('aria-label="Inspector"');
    expect(markup).toContain('Layers');
    expect(markup).toContain('Components');
    expect(markup).toContain('Search components and icons...');
    expect(markup).toContain('aria-label="Theme Selection"');
    expect(markup).toContain('Default Theme');
    expect(markup).toContain('Monochrome');
    expect(markup).toContain('No Shadows');
    expect(markup).toContain('draggable="true"');
    expect(markup).toContain('component-icon');
    expect(markup).toContain('Group');
    expect(markup).toContain('Drag components here');
    expect(markup).not.toContain('Labels');
    expect(markup).not.toContain('Create Node');
    expect(markup).toContain('canvas-actions-panel');
    expect(markup).toContain('Duplicate');
    expect(markup).toContain('Delete');
    expect(markup).toContain('aria-label="Clear canvas"');
    expect(markup).toContain('aria-label="Zoom out"');
    expect(markup).toContain('aria-label="Zoom in"');
    expect(markup).toContain('aria-label="Collapse Library"');
    expect(markup).toContain('aria-label="Collapse Inspector"');
    expect(markup).toContain('aria-label="Open Library"');
    expect(markup).toContain('aria-label="Open Inspector"');
  });

  it('renders text controls as multiline textareas', () => {
    const markup = renderToStaticMarkup(
      <ControlInput
        control={{ kind: 'text', key: 'title', label: 'Title' }}
        value={'line 1\nline 2'}
        onChange={() => undefined}
      />,
    );

    expect(markup).toContain('<textarea');
    expect(markup).toContain('line 1');
    expect(markup).toContain('line 2');
    expect(markup).toContain('rows="1"');
    expect(markup).toContain('resize:none');
  });

  it('renders group title and style controls', () => {
    const markup = renderToStaticMarkup(
      <GroupPanel
        group={{
          id: 'group-1',
          label: 'Group',
          position: { x: 10, y: 20 },
          size: { width: 280, height: 160 },
          fillColor: 'none',
          labelColor: '#0f172a',
          labelSize: 12,
        }}
        onGroupChange={() => {}}
      />,
    );

    expect(markup).toContain('Title');
    expect(markup).toContain('Background color');
    expect(markup).toContain('Title color');
    expect(markup).toContain('Title size');
    expect(markup).toContain('step="10"');
  });

  it('opens a gap in preview connections under attached labels', () => {
    const connected = addNodeToCanvas(
      addNodeToCanvas(createDefaultWorkbenchState(), 'box', { x: 100, y: 100 }),
      'document',
      { x: 420, y: 100 },
    );
    const state = addNodeToCanvas(
      selectCanvasItem(connected, { kind: 'connection', id: connected.connections[0]!.id }),
      'label',
      { x: 0, y: 0 },
      { title: 'something nice' },
    );
    const connection = state.connections[0]!;
    const points = renderedShaftPoints(state, 0);
    const pathData = previewConnectionPathData(state, connection, points, renderedNodeBoxResolver(state, 0));
    const markup = renderToStaticMarkup(<WorkbenchCanvas state={state} onStateChange={() => undefined} />);

    expect(pathData.match(/M /g)).toHaveLength(2);
    expect(markup).toContain(`d="${pathData}"`);
  });

  it('opens an attached-label gap across vertical preview connection bends', () => {
    const connected = addNodeToCanvas(
      addNodeToCanvas(createDefaultWorkbenchState(), 'box', { x: 100, y: 100 }),
      'box',
      { x: 100, y: 340 },
    );
    const state = addNodeToCanvas(
      selectCanvasItem(connected, { kind: 'connection', id: connected.connections[0]!.id }),
      'label',
      { x: 0, y: 0 },
      { title: 'something nice' },
    );
    const connection = state.connections[0]!;
    const points = renderedShaftPoints(state, 0);
    const pathData = previewConnectionPathData(state, connection, points, renderedNodeBoxResolver(state, 0));

    expect(pathData.match(/M /g)).toHaveLength(2);
    expect(pathData).not.toContain('L 84 256 L 84');
  });

  it('renders diagram edge labels loaded onto preview connections', () => {
    const state = addNodeToCanvas(
      addNodeToCanvas(createDefaultWorkbenchState(), 'box', { x: 100, y: 100 }),
      'document',
      { x: 420, y: 100 },
    );
    state.connections[0]!.label = 'replicate';

    const markup = renderToStaticMarkup(
      <WorkbenchCanvas state={state} onStateChange={() => undefined} />,
    );

    expect(markup).toContain('replicate');
  });

  it('uses the shared shaft path gaps for loaded preview edge labels', () => {
    const state = addNodeToCanvas(
      addNodeToCanvas(createDefaultWorkbenchState(), 'box', { x: 100, y: 100 }),
      'document',
      { x: 420, y: 100 },
    );
    state.connections[0]!.label = 'replicate';

    const layout = renderedPreviewLayout(state);
    const sharedPath = edgeLinePathData(layout.edges[0]!, {
      trimForMarkers: true,
      markerSize: state.connections[0]!.props.arrowSize,
    });
    const markup = renderToStaticMarkup(
      <WorkbenchCanvas state={state} onStateChange={() => undefined} />,
    );

    expect(sharedPath.match(/M /g)?.length ?? 0).toBeGreaterThan(1);
    expect(markup).toContain(`d="${sharedPath}"`);
  });

  it('keeps attachment anchor dots invisible in the standard preview canvas', () => {
    const state = addNodeToCanvas(
      addNodeToCanvas(createDefaultWorkbenchState(), 'box', { x: 100, y: 100 }),
      'box',
      { x: 420, y: 100 },
    );

    const markup = renderToStaticMarkup(
      <WorkbenchCanvas state={state} onStateChange={() => undefined} />,
    );

    expect(markup).not.toContain('class="slot-dot"');
  });

  it('keeps first-drop auto-connections attached to the rendered node borders', () => {
    const state = addNodeToCanvas(
      addNodeToCanvas(createDefaultWorkbenchState(), 'box', { x: 100, y: 100 }),
      'box',
      { x: 420, y: 220 },
    );
    const connection = state.connections[0]!;
    const routedPoints = renderedConnectionPoints(state, 0);
    const points = renderedShaftPoints(state, 0);
    const pathData = previewConnectionPathData(
      state,
      connection,
      points,
      (nodeId) => renderedNodeBoxFor(state, nodeId),
    );
    const markup = renderToStaticMarkup(
      <WorkbenchCanvas state={state} onStateChange={() => undefined} />,
    );
    const fromBox = renderedNodeBoxFor(state, connection.fromNodeId)!;
    const toBox = renderedNodeBoxFor(state, connection.toNodeId)!;

    expect(markup).toContain(`d="${pathData}"`);
    expect(pointOnBoxPerimeter(routedPoints[0]!, fromBox)).toBe(true);
    expect(pointOnBoxPerimeter(routedPoints.at(-1)!, toBox)).toBe(true);
  });

  it('offsets preview start markers outward from the source node border', () => {
    const state = addNodeToCanvas(
      addNodeToCanvas(createDefaultWorkbenchState(), 'box', { x: 100, y: 100 }),
      'box',
      { x: 420, y: 100 },
    );
    state.connections[0]!.props.startMarker = 'circle';
    state.connections[0]!.props.arrowSize = 13;

    const layout = renderedPreviewLayout(state);
    const edge = layout.edges[0]!;
    const markerCarrierPoints = edgeLineMarkerPoints(edge, {
      markerSize: state.connections[0]!.props.arrowSize,
    });
    const fromBox = renderedNodeBoxFor(state, state.connections[0]!.fromNodeId)!;
    const markup = renderToStaticMarkup(
      <WorkbenchCanvas state={state} onStateChange={() => undefined} />,
    );

    expect(markerCarrierPoints[0]!.x).toBeGreaterThan(fromBox.x + fromBox.width);
    expect(markup).toContain('marker-start=');
  });

  it('routes into app nodes without detouring around invisible padding', () => {
    const state = addNodeToCanvas(
      addNodeToCanvas(createDefaultWorkbenchState(), 'box', { x: 40, y: 40 }),
      'app',
      { x: 220, y: 180 },
    );
    const connection = state.connections[0]!;
    const routedPoints = renderedConnectionPoints(state, 0);
    const pathData = previewConnectionPathData(
      state,
      connection,
      renderedShaftPoints(state, 0),
      (nodeId) => renderedNodeBoxFor(state, nodeId),
    );
    const markup = renderToStaticMarkup(
      <WorkbenchCanvas state={state} onStateChange={() => undefined} />,
    );

    expect(markup).toContain(`d="${pathData}"`);
    expect(routedPoints).toHaveLength(4);
  });

  it('renders bridge overlays when preview connections cross', () => {
    const state = crossingWorkbenchState();
    const layout = renderedPreviewLayout(state);
    const bridgeMaskPath = layout.edges
      .map((edge) => edgeBridgeMaskPathData(edge))
      .find((path) => path.length > 0);
    const markup = renderToStaticMarkup(
      <WorkbenchCanvas state={state} onStateChange={() => undefined} />,
    );

    expect(bridgeMaskPath).toBeTruthy();
    expect(markup.split(`d="${bridgeMaskPath}"`).length - 1).toBe(2);
  });

  it('filters sidebar components by search text', () => {
    const labels = filterComponents(createDefaultWorkbenchState(), 'document').map((item) => item.label);

    expect(labels).toEqual(['Document']);
  });

  it('excludes icon and labelIcon components from the catalog list', () => {
    const items = filterComponents(createDefaultWorkbenchState(), '');
    const ids = items.map((item) => item.id);
    expect(ids).not.toContain('icon');
    expect(ids).not.toContain('labelIcon');
    // Ensure others are present
    expect(ids).toContain('box');
    expect(ids).toContain('app');
    expect(ids).toContain('document');
    expect(ids).toContain('website');
    expect(ids).toContain('group');
  });

  it('searches Iconify results for the top search dropdown', async () => {
    const results = await searchPreviewIcons('cloud');
    const fullNames = results.map((icon) => icon.fullName);

    expect(results.length).toBeGreaterThan(24);
    expect(fullNames).toContain('material-symbols:cloud');
    expect(fullNames.some((name) => !name.startsWith('material-symbols:'))).toBe(true);
  });

  it('supports slash as the global search focus shortcut', () => {
    expect(shouldFocusSearchFromShortcut({
      key: '/',
      metaKey: false,
      ctrlKey: false,
      altKey: false,
      target: null,
    })).toBe(true);
    expect(shouldFocusSearchFromShortcut({
      key: '/',
      metaKey: true,
      ctrlKey: false,
      altKey: false,
      target: null,
    })).toBe(false);
  });
});
