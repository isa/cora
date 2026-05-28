import { useEffect, useRef, useState, type DragEvent, type PointerEvent } from 'react';

import type { LayoutedEdge, LayoutedNode, ThemeTokens } from '../../layout-ir.js';
import { computePreservedLayout } from '../../core/layout.js';
import { updateLabeledEdgePlacements } from '../../core/labeledEdgeExpansion.js';
import { measureNodes } from '../../core/measureText.js';
import { applyNodeStyles, resolveTheme } from '../../core/themeResolver.js';
import { EdgeLabel } from '../../renderer/components/edges/EdgeLabel.js';
import {
  edgeBridgeMaskPathData,
  edgeLinePathData,
  edgeLineMarkerPoints,
  edgeMarkerCarrierPathData,
} from '../../renderer/components/edges/edgePath.js';
import { Line, linePathData } from '../../renderer/components/lines/Line.js';
import { LineMarkerDefs, markerUrl } from '../../renderer/components/lines/markers.js';
import { previewIconForName } from '../iconRenderer.js';
import { previewIcon } from '../pack/builtins.js';
import { API_SIZE_PRESETS, APP_SIZE_PRESETS, DATABASE_SIZE_PRESETS, DOCUMENT_SIZE_PRESETS, WEBSITE_SIZE_PRESETS, LABEL_ICON_SIZE_PRESETS } from '../../renderer/components/styles.js';
import { catalogDefaultProps } from '../../renderer/themes/componentDefaults.js';
import { defaultTheme } from '../../renderer/themes/default.js';
import { toMonochrome, withoutShadow } from '../../renderer/themes/transforms.js';
import { connectionDefaults } from '../controls/defaults.js';
import {
  applyConnectionMarkerInsets,
  connectionCenter,
  computeConnectionCenter,
  computeConnectionPoints,
  computeNodeBox,
  computeSceneAttachmentSlots,
  previewNodeSize,
} from '../geometry.js';
import {
  addCatalogItemToCanvas,
  clearSelection,
  deleteSelected,
  reconnectConnectionEndpoint,
  selectCanvasItem,
  setGroupPosition,
  setGroupSize,
  setNodePosition,
  type CanvasSelection,
  type WorkbenchState,
  type CanvasNode,
  type CanvasConnection,
} from '../state.js';
import { serializeWorkbenchDocument } from '../persistence.js';
import { AttachmentOverlay } from './AttachmentOverlay.js';

interface WorkbenchCanvasProps {
  state: WorkbenchState;
  onStateChange(state: WorkbenchState): void;
  onClear?(): void;
  onIconDrop?(): void;
  activeTheme?: 'default' | 'monochrome' | 'without-shadow';
}

type DragTarget =
  | { kind: 'node'; id: string }
  | { kind: 'group'; id: string }
  | { kind: 'group-resize'; id: string }
  | { kind: 'connection-endpoint'; id: string; endpoint: 'from' | 'to' }
  | { kind: 'pan' };

type EndpointDrag = {
  connectionId: string;
  endpoint: 'from' | 'to';
  point: PreviewPoint;
  hoverNodeId?: string;
};

const DEFAULT_VIEWPORT = { width: 960, height: 640 };
const ATTACHED_LABEL_GAP_X = 4;
const ATTACHED_LABEL_GAP_Y = 3;
const MIN_LABEL_LINE_STUB = 12;

type PreviewPoint = { x: number; y: number };

function pointAtRatio(a: PreviewPoint, b: PreviewPoint, ratio: number): PreviewPoint {
  return {
    x: a.x + (b.x - a.x) * ratio,
    y: a.y + (b.y - a.y) * ratio,
  };
}

function pointDistance(a: PreviewPoint, b: PreviewPoint): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function samePoint(a: PreviewPoint, b: PreviewPoint): boolean {
  return Math.abs(a.x - b.x) < 0.001 && Math.abs(a.y - b.y) < 0.001;
}

function segmentRatioForPoint(a: PreviewPoint, b: PreviewPoint, point: PreviewPoint): number | undefined {
  const length = pointDistance(a, b);
  if (length === 0) {
    return undefined;
  }

  if (Math.abs(a.y - b.y) < 0.001 && Math.abs(point.y - a.y) < 0.001) {
    const minX = Math.min(a.x, b.x) - 0.001;
    const maxX = Math.max(a.x, b.x) + 0.001;
    if (point.x < minX || point.x > maxX) {
      return undefined;
    }
    return (point.x - a.x) / (b.x - a.x);
  }

  if (Math.abs(a.x - b.x) < 0.001 && Math.abs(point.x - a.x) < 0.001) {
    const minY = Math.min(a.y, b.y) - 0.001;
    const maxY = Math.max(a.y, b.y) + 0.001;
    if (point.y < minY || point.y > maxY) {
      return undefined;
    }
    return (point.y - a.y) / (b.y - a.y);
  }

  return undefined;
}

function pathLength(points: PreviewPoint[]): number {
  return points.slice(1).reduce(
    (total, point, index) => total + pointDistance(points[index]!, point),
    0,
  );
}

function pointAtPathDistance(points: PreviewPoint[], distance: number): PreviewPoint {
  if (points.length === 0) {
    return { x: 0, y: 0 };
  }

  let cursor = 0;
  for (let index = 0; index < points.length - 1; index++) {
    const start = points[index]!;
    const end = points[index + 1]!;
    const length = pointDistance(start, end);
    if (length === 0) {
      continue;
    }

    if (cursor + length >= distance) {
      return pointAtRatio(start, end, (distance - cursor) / length);
    }

    cursor += length;
  }

  return points.at(-1)!;
}

function pushDistinct(points: PreviewPoint[], point: PreviewPoint): void {
  const previous = points.at(-1);
  if (!previous || !samePoint(previous, point)) {
    points.push(point);
  }
}

function pathSlice(points: PreviewPoint[], startDistance: number, endDistance: number): PreviewPoint[] {
  if (points.length === 0 || endDistance <= startDistance) {
    return [];
  }

  const slice = [pointAtPathDistance(points, startDistance)];
  let cursor = 0;
  for (let index = 0; index < points.length - 1; index++) {
    const start = points[index]!;
    const end = points[index + 1]!;
    const length = pointDistance(start, end);
    const segmentEndDistance = cursor + length;
    if (length > 0 && segmentEndDistance > startDistance && segmentEndDistance < endDistance) {
      pushDistinct(slice, end);
    }
    cursor = segmentEndDistance;
  }
  pushDistinct(slice, pointAtPathDistance(points, endDistance));
  return slice;
}

function mergeGaps(gaps: Array<{ startDistance: number; endDistance: number }>) {
  const sorted = gaps
    .slice()
    .sort((a, b) => a.startDistance - b.startDistance);
  const merged: Array<{ startDistance: number; endDistance: number }> = [];

  for (const gap of sorted) {
    const previous = merged.at(-1);
    if (!previous || gap.startDistance > previous.endDistance) {
      merged.push({ ...gap });
    } else {
      previous.endDistance = Math.max(previous.endDistance, gap.endDistance);
    }
  }

  return merged;
}

function connectionPathDataWithGaps(
  points: PreviewPoint[],
  gaps: Array<{ startDistance: number; endDistance: number }>,
): string {
  if (points.length === 0 || gaps.length === 0) {
    return linePathData(points);
  }

  const totalLength = pathLength(points);
  const subpaths: PreviewPoint[][] = [];
  let cursor = 0;

  for (const gap of mergeGaps(gaps)) {
    if (gap.startDistance > cursor) {
      subpaths.push(pathSlice(points, cursor, gap.startDistance));
    }
    cursor = Math.max(cursor, gap.endDistance);
  }

  if (cursor < totalLength) {
    subpaths.push(pathSlice(points, cursor, totalLength));
  }

  return subpaths
    .filter((subpath) => subpath.length >= 2)
    .map((subpath) => linePathData(subpath))
    .join(' ');
}

export function previewConnectionPathData(
  state: WorkbenchState,
  connection: CanvasConnection,
  points: PreviewPoint[],
  getNodeBox: (nodeId: string) => ReturnType<typeof computeNodeBox> = (nodeId) => computeNodeBox(state, nodeId),
): string {
  const gaps: Array<{ startDistance: number; endDistance: number }> = [];

  for (const node of state.nodes) {
    if (node.attachedConnectionId !== connection.id || node.componentId !== 'label') {
      continue;
    }

    const box = getNodeBox(node.id);
    if (!box) {
      continue;
    }

    const center = {
      x: box.x + box.width / 2,
      y: box.y + box.height / 2,
    };

    let cursor = 0;
    for (let index = 0; index < points.length - 1; index++) {
      const start = points[index]!;
      const end = points[index + 1]!;
      const length = pointDistance(start, end);
      const ratio = segmentRatioForPoint(start, end, center);
      if (ratio === undefined) {
        cursor += length;
        continue;
      }

      const horizontal = Math.abs(start.y - end.y) < 0.001;
      const halfSpan = horizontal
        ? box.width / 2 + ATTACHED_LABEL_GAP_X
        : box.height / 2 + ATTACHED_LABEL_GAP_Y;
      const totalLength = pathLength(points);
      const centerDistance = cursor + ratio * length;
      const availableHalfSpan = Math.max(
        0,
        Math.min(centerDistance, totalLength - centerDistance) - MIN_LABEL_LINE_STUB,
      );
      const effectiveHalfSpan = Math.min(halfSpan, availableHalfSpan);
      if (effectiveHalfSpan <= 0) {
        break;
      }

      gaps.push({
        startDistance: centerDistance - effectiveHalfSpan,
        endDistance: centerDistance + effectiveHalfSpan,
      });
      break;
    }
  }

  return connectionPathDataWithGaps(points, gaps);
}

function resolvePreviewTheme(
  activeTheme: 'default' | 'monochrome' | 'without-shadow',
): ThemeTokens {
  if (activeTheme === 'monochrome') {
    return toMonochrome(defaultTheme);
  }

  if (activeTheme === 'without-shadow') {
    return withoutShadow(defaultTheme);
  }

  return defaultTheme;
}

function previewLayoutNodes(state: WorkbenchState): LayoutedNode[] {
  return state.nodes
    .filter((node) => !node.attachedConnectionId)
    .flatMap((node) => {
      const box = computeNodeBox(state, node.id);
      if (!box) {
        return [];
      }

      return [{
        id: node.id,
        label: String(node.props.title ?? node.props.text ?? ''),
        component: node.componentId as LayoutedNode['component'],
        x: box.x,
        y: box.y,
        measuredWidth: box.width,
        measuredHeight: box.height,
      }];
    });
}

function previewLayoutEdge(
  state: WorkbenchState,
  connection: CanvasConnection,
  nodes: LayoutedNode[],
): LayoutedEdge {
  const edge: LayoutedEdge = {
    from: connection.fromNodeId,
    to: connection.toNodeId,
    label: connection.label,
    startMarker: connection.props.startMarker,
    endMarker: connection.props.endMarker,
    points: computeConnectionPoints(state, connection).map((point) => ({ ...point })),
  };

  if (edge.label) {
    updateLabeledEdgePlacements(nodes, [edge]);
  }

  return edge;
}

function layoutedNodeBox(node: LayoutedNode): ReturnType<typeof computeNodeBox> {
  return {
    id: node.id,
    x: node.x,
    y: node.y,
    width: node.measuredWidth,
    height: node.measuredHeight,
  };
}

function sharedPreviewLayout(state: WorkbenchState) {
  if (state.nodes.length === 0 || state.connections.length === 0) {
    return undefined;
  }

  const document = serializeWorkbenchDocument(state);
  const attachedNodeIds = new Set(
    state.nodes
      .filter((node) => node.attachedConnectionId)
      .map((node) => node.id),
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

  return computePreservedLayout({
    diagram: document.diagram,
    measuredNodes: applyNodeStyles(measureNodes(document.diagram.nodes), nodeStyles),
    theme,
    // Keep preview geometry in the same canvas coordinate space as the live nodes.
    offset: false,
  });
}

function renderedNodeBox(
  state: WorkbenchState,
  nodeId: string,
  renderedEdgesByConnectionId: Map<string, LayoutedEdge>,
  renderedNodesById: Map<string, LayoutedNode>,
): ReturnType<typeof computeNodeBox> {
  const node = state.nodes.find((item) => item.id === nodeId);
  if (!node) {
    return undefined;
  }

  if (!node.attachedConnectionId) {
    const renderedNode = renderedNodesById.get(node.id);
    return renderedNode ? layoutedNodeBox(renderedNode) : computeNodeBox(state, nodeId);
  }

  if (node.componentId === 'labelIcon') {
    return computeNodeBox(state, nodeId);
  }

  const edge = renderedEdgesByConnectionId.get(node.attachedConnectionId);
  if (!edge) {
    return computeNodeBox(state, nodeId);
  }

  const size = previewNodeSize(node);
  const center = connectionCenter(edge.points);
  if (!center) {
    return computeNodeBox(state, nodeId);
  }

  return {
    id: node.id,
    x: center.x - size.width / 2,
    y: center.y - size.height / 2,
    width: size.width,
    height: size.height,
  };
}

function getEffectiveNodeProps(
  node: CanvasNode,
  activeTheme: 'default' | 'monochrome' | 'without-shadow',
) {
  const defaultProps = catalogDefaultProps(node.componentId as any) || {};
  const themeTokens = resolvePreviewTheme(activeTheme);

  const shapeStyle = themeTokens.shapes[node.componentId] ?? themeTokens.shapes.box!;
  const effective = { ...node.props };

  const isSameColor = (c1: string, c2: string) => {
    if (c1 === c2) return true;
    if (!c1 || !c2) return false;
    return c1.toLowerCase() === c2.toLowerCase();
  };

  // Override colors and styles if they match the default lookup
  if (isSameColor(effective.backgroundColor || '', defaultProps.backgroundColor || '')) {
    effective.backgroundColor = shapeStyle.fill;
  }

  if (isSameColor(effective.borderColor || '', defaultProps.borderColor || '')) {
    effective.borderColor = shapeStyle.stroke;
  }

  if (effective.borderWidth === defaultProps.borderWidth) {
    effective.borderWidth = shapeStyle.strokeWidth;
  }

  if (effective.borderStyle === defaultProps.borderStyle) {
    if (shapeStyle.strokeDasharray) {
      effective.borderStyle = 'dashed';
    } else if (shapeStyle.stroke === 'none') {
      effective.borderStyle = 'none';
    } else {
      effective.borderStyle = 'solid';
    }
  }

  if (isSameColor(effective.textColor || '', defaultProps.textColor || '')) {
    effective.textColor = shapeStyle.labelFill ?? themeTokens.nodeLabel.fill;
  }

  if (isSameColor(effective.subtitleColor || '', defaultProps.subtitleColor || '')) {
    effective.subtitleColor = activeTheme === 'monochrome' ? '#000000' : defaultProps.subtitleColor;
  }

  if (isSameColor(effective.iconColor || '', defaultProps.iconColor || '')) {
    effective.iconColor = activeTheme === 'monochrome' ? '#000000' : defaultProps.iconColor;
  }

  if (activeTheme === 'without-shadow') {
    effective.shadow = 'none';
  } else if (effective.shadow === defaultProps.shadow) {
    effective.shadow = shapeStyle.shadow ? 'cast' : 'none';
  }

  return effective;
}

function renderNode(
  state: WorkbenchState,
  nodeId: string,
  activeTheme: 'default' | 'monochrome' | 'without-shadow' = 'default',
  boxOverride?: NonNullable<ReturnType<typeof computeNodeBox>>,
) {
  const node = state.nodes.find((item) => item.id === nodeId);
  if (!node) {
    return null;
  }
  const box = boxOverride ?? computeNodeBox(state, node.id);
  if (!box) {
    return null;
  }
  const definition = state.pack.components.find((component) => component.id === node.componentId)!;
  const Component = definition.component;
  const effectiveProps = getEffectiveNodeProps(node, activeTheme);
  const iconProps =
    node.componentId === 'icon' || node.componentId === 'labelIcon'
      ? { icon: effectiveProps.iconName ? previewIconForName(String(effectiveProps.iconName)) : previewIcon }
      : {};
  const props = {
    ...effectiveProps,
    size: { width: box.width, height: box.height },
    x: box.x,
    y: box.y,
    ...iconProps,
  };

  return (
    <g
      key={node.id}
      className={state.selected?.kind === 'node' && state.selected.id === node.id ? 'preview-node selected' : 'preview-node'}
      data-node-id={node.id}
    >
      {node.attachedConnectionId && node.componentId === 'label' && effectiveProps.backgroundColor && effectiveProps.backgroundColor !== 'transparent' && effectiveProps.backgroundColor !== 'none' ? (
        <rect
          x={box.x - 4}
          y={box.y - 3}
          width={box.width + 8}
          height={box.height + 6}
          rx={effectiveProps.radius ?? 12}
          ry={effectiveProps.radius ?? 12}
          fill={effectiveProps.backgroundColor}
          stroke="none"
        />
      ) : null}
      <Component {...props} />
      <rect
        x={box.x - selectionPadding(node.componentId)}
        y={box.y - selectionPadding(node.componentId)}
        width={box.width + selectionPadding(node.componentId) * 2}
        height={box.height + selectionPadding(node.componentId) * 2}
        rx={node.componentId === 'icon' || node.componentId === 'labelIcon' ? 6 : 10}
        className="node-hover-outline"
      />
    </g>
  );
}

export function WorkbenchCanvas({ state, onStateChange, onClear, onIconDrop, activeTheme = 'default' }: WorkbenchCanvasProps) {
  const canvasRegionRef = useRef<HTMLElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const panStartRef = useRef<{ clientX: number; clientY: number; pan: { x: number; y: number } } | undefined>(undefined);
  const [dragTarget, setDragTarget] = useState<DragTarget | undefined>();
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [endpointDrag, setEndpointDrag] = useState<EndpointDrag | undefined>();
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [viewport, setViewport] = useState(DEFAULT_VIEWPORT);
  const [isSpaceDown, setIsSpaceDown] = useState(false);
  const viewBox = zoomViewBox(zoom, pan, viewport);

  const zoomRef = useRef(zoom);
  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) {
      return;
    }

    const handleWheel = (event: WheelEvent) => {
      const currentZoom = zoomRef.current;
      const isZoomGesture = event.ctrlKey || event.metaKey;

      event.preventDefault();

      if (isZoomGesture) {
        const delta = -event.deltaY * 0.01;
        setZoom((value) => Math.min(2, Math.max(0.65, Number((value + delta).toFixed(2)))));
        return;
      }

      setPan((prev) => ({
        x: prev.x + event.deltaX / currentZoom,
        y: prev.y + event.deltaY / currentZoom,
      }));
    };

    svg.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      svg.removeEventListener('wheel', handleWheel);
    };
  }, []);
  const themeTokens = resolvePreviewTheme(activeTheme);
  const labelLayoutNodes = previewLayoutNodes(state);
  const sharedLayout = sharedPreviewLayout(state);
  const sharedGroupsById = new Map((sharedLayout?.groups ?? []).map((group) => [group.id, group]));
  const renderedNodesById = new Map((sharedLayout?.nodes ?? []).map((node) => [node.id, node]));
  const renderedEdgesByConnectionId = new Map(
    state.connections.flatMap((connection, index) => {
      const edge = sharedLayout?.edges[index];
      return edge ? [[connection.id, edge] as const] : [];
    }),
  );
  const renderedNodeBoxesById = new Map(
    state.nodes.flatMap((node) => {
      const box = renderedNodeBox(state, node.id, renderedEdgesByConnectionId, renderedNodesById);
      return box ? [[node.id, box] as const] : [];
    }),
  );
  const slots = computeSceneAttachmentSlots(state);
  const boxes = state.nodes
    .filter((node) => node.componentId !== 'label' && node.componentId !== 'labelIcon')
    .map((node) => renderedNodeBoxesById.get(node.id) ?? computeNodeBox(state, node.id))
    .filter(Boolean) as NonNullable<ReturnType<typeof computeNodeBox>>[];
  const renderedConnections = state.connections.map((connection, index) => {
    const edge = sharedLayout?.edges[index] ?? previewLayoutEdge(state, connection, labelLayoutNodes);
    const markerCarrierPoints = edgeLineMarkerPoints(edge, {
      markerSize: connection.props.arrowSize,
    });
    const markerCarrierPath = edgeMarkerCarrierPathData(edge, {
      markerSize: connection.props.arrowSize,
    });
    const shaftPoints = applyConnectionMarkerInsets(markerCarrierPoints, connection.props);
    const hasAttachedLabelNode = state.nodes.some(
      (node) => node.attachedConnectionId === connection.id && node.componentId === 'label',
    );
    const shaftPath = hasAttachedLabelNode && !edge.label
      ? previewConnectionPathData(
          state,
          connection,
          shaftPoints,
          (nodeId) => renderedNodeBoxesById.get(nodeId) ?? computeNodeBox(state, nodeId),
        )
      : edgeLinePathData(edge, {
          trimForMarkers: true,
          markerSize: connection.props.arrowSize,
        });
    const hitPath = linePathData(edge.points);
    const bridgeMaskPath = edgeBridgeMaskPathData(edge);
    const hasMarkers =
      connection.props.startMarker !== 'none' || connection.props.endMarker !== 'none';
    const selected = state.selected?.kind === 'connection' && state.selected.id === connection.id;
    const isSameColor = (c1: string, c2: string) => {
      if (c1 === c2) return true;
      if (!c1 || !c2) return false;
      return c1.toLowerCase() === c2.toLowerCase();
    };
    const connectionStrokeColor =
      activeTheme === 'monochrome' && isSameColor(connection.props.strokeColor, connectionDefaults.strokeColor)
        ? '#000000'
        : connection.props.strokeColor;

    return {
      connection,
      edge,
      shaftPoints,
      shaftPath,
      hitPath,
      bridgeMaskPath,
      markerCarrierPath,
      hasMarkers,
      selected,
      connectionStrokeColor,
    };
  });

  useEffect(() => {
    const region = canvasRegionRef.current;
    if (!region) {
      return;
    }
    const syncViewport = () => {
      const rect = region.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setViewport({ width: rect.width, height: rect.height });
      }
    };
    syncViewport();
    const observer = new ResizeObserver(syncViewport);
    observer.observe(region);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const isEditable = (target: EventTarget | null) => {
      return target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement;
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space' && !isEditable(event.target)) {
        event.preventDefault();
        setIsSpaceDown(true);
      } else if ((event.key === 'Backspace' || event.key === 'Delete') && !isEditable(event.target)) {
        if (state.selected) {
          event.preventDefault();
          onStateChange(deleteSelected(state));
        }
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        setIsSpaceDown(false);
        if (dragTarget?.kind === 'pan') {
          setDragTarget(undefined);
          panStartRef.current = undefined;
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [dragTarget?.kind, state, onStateChange]);

  const toCanvasPoint = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) {
      return { x: clientX, y: clientY };
    }
    const matrix = svg.getScreenCTM();
    if (matrix) {
      const point = new DOMPoint(clientX, clientY).matrixTransform(matrix.inverse());
      return { x: point.x, y: point.y };
    }
    const rect = svg.getBoundingClientRect();
    return {
      x: viewBox.x + ((clientX - rect.left) / rect.width) * viewBox.width,
      y: viewBox.y + ((clientY - rect.top) / rect.height) * viewBox.height,
    };
  };

  // Topmost real node whose box contains the point — used to resolve where a
  // dragged connection endpoint should re-attach. Labels attach to lines, not ends.
  const nodeAtPoint = (point: PreviewPoint): string | undefined => {
    for (let index = state.nodes.length - 1; index >= 0; index--) {
      const node = state.nodes[index]!;
      if (node.componentId === 'label' || node.componentId === 'labelIcon') {
        continue;
      }
      const box = renderedNodeBoxesById.get(node.id) ?? computeNodeBox(state, node.id);
      if (!box) {
        continue;
      }
      if (
        point.x >= box.x &&
        point.x <= box.x + box.width &&
        point.y >= box.y &&
        point.y <= box.y + box.height
      ) {
        return node.id;
      }
    }
    return undefined;
  };

  const onDrop = (event: DragEvent<SVGSVGElement>) => {
    event.preventDefault();
    const iconPayload = event.dataTransfer.getData('application/x-cora-icon');
    let iconProps: Record<string, unknown> | undefined;
    const point = toCanvasPoint(event.clientX, event.clientY);
    const nearestConnection = iconPayload ? nearestConnectionAtPoint(state, point) : undefined;
    let componentId = event.dataTransfer.getData('application/x-cora-component');

    if (iconPayload) {
      try {
        const parsed = JSON.parse(iconPayload) as { name: string; fullName: string };
        const isLabelIcon = Boolean(nearestConnection);
        iconProps = {
          title: isLabelIcon ? '' : parsed.name,
          subtitle: '',
          iconName: parsed.fullName,
          size: 'lg',
        };
        componentId = isLabelIcon ? 'labelIcon' : 'icon';
      } catch {
        iconProps = undefined;
      }
    }

    if (!componentId) {
      return;
    }
    let props: Record<string, unknown> = {};
    const catalogItem = event.dataTransfer.getData('application/x-cora-catalog-item');
    if (catalogItem) {
      try {
        const parsed = JSON.parse(catalogItem) as { props?: Record<string, unknown> };
        props = parsed.props ?? {};
      } catch {
        props = {};
      }
    }
    props = { ...props, ...iconProps };
    const dropState =
      nearestConnection
        ? selectCanvasItem(state, { kind: 'connection', id: nearestConnection.id })
        : (componentId === 'label' || componentId === 'labelIcon') && state.selected?.kind !== 'connection'
          ? selectNearestConnection(state, point)
        : state;
    const dropSize =
      componentId === 'group' ? { width: 280, height: 160 }
      : componentId === 'website' ? WEBSITE_SIZE_PRESETS.lg
      : componentId === 'api' ? API_SIZE_PRESETS.lg
      : componentId === 'database' ? DATABASE_SIZE_PRESETS.lg
      : componentId === 'app' ? APP_SIZE_PRESETS.lg
      : componentId === 'document' ? DOCUMENT_SIZE_PRESETS.lg
      : componentId === 'icon' ? APP_SIZE_PRESETS.lg
      : componentId === 'labelIcon' ? LABEL_ICON_SIZE_PRESETS.lg
      : { width: 176, height: 72 };
    onStateChange(addCatalogItemToCanvas(dropState, componentId, {
      x: Math.max(16, point.x - dropSize.width / 2),
      y: Math.max(16, point.y - dropSize.height / 2),
    }, props));
    if (iconPayload) {
      onIconDrop?.();
    }
  };

  const onPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    if (!dragTarget || event.buttons !== 1) {
      return;
    }
    if (dragTarget.kind === 'pan') {
      const start = panStartRef.current;
      const svg = svgRef.current;
      if (!start || !svg) {
        return;
      }
      const rect = svg.getBoundingClientRect();
      const dx = ((event.clientX - start.clientX) / rect.width) * viewBox.width;
      const dy = ((event.clientY - start.clientY) / rect.height) * viewBox.height;
      setPan({ x: start.pan.x - dx, y: start.pan.y - dy });
      return;
    }
    if (dragTarget.kind === 'connection-endpoint') {
      const point = toCanvasPoint(event.clientX, event.clientY);
      setEndpointDrag({
        connectionId: dragTarget.id,
        endpoint: dragTarget.endpoint,
        point,
        hoverNodeId: nodeAtPoint(point),
      });
      return;
    }
    const point = toCanvasPoint(event.clientX, event.clientY);
    const position = {
      x: point.x - dragOffset.x,
      y: point.y - dragOffset.y,
    };
    if (dragTarget.kind === 'group-resize') {
      const group = state.groups.find((item) => item.id === dragTarget.id);
      if (!group) {
        return;
      }
      onStateChange(setGroupSize(state, group.id, {
        width: Math.max(120, point.x - group.position.x),
        height: Math.max(80, point.y - group.position.y),
      }));
      return;
    }
    onStateChange(
      dragTarget.kind === 'node'
        ? setNodePosition(state, dragTarget.id, position)
        : setGroupPosition(state, dragTarget.id, position),
    );
  };

  const beginDrag = (
    event: PointerEvent<SVGGElement>,
    target: DragTarget,
    position: { x: number; y: number },
  ) => {
    const point = toCanvasPoint(event.clientX, event.clientY);
    svgRef.current?.setPointerCapture(event.pointerId);
    setDragTarget(target);
    setDragOffset({ x: point.x - position.x, y: point.y - position.y });
    onStateChange(selectCanvasItem(state, target as CanvasSelection));
  };

  const beginPan = (event: PointerEvent<SVGSVGElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    panStartRef.current = {
      clientX: event.clientX,
      clientY: event.clientY,
      pan,
    };
    setDragTarget({ kind: 'pan' });
  };

  const beginGroupResize = (
    event: PointerEvent<SVGRectElement>,
    id: string,
  ) => {
    event.stopPropagation();
    svgRef.current?.setPointerCapture(event.pointerId);
    setDragTarget({ kind: 'group-resize', id });
    onStateChange(selectCanvasItem(state, { kind: 'group', id }));
  };

  const beginEndpointDrag = (
    event: PointerEvent<SVGCircleElement>,
    connectionId: string,
    endpoint: 'from' | 'to',
  ) => {
    event.stopPropagation();
    svgRef.current?.setPointerCapture(event.pointerId);
    setDragTarget({ kind: 'connection-endpoint', id: connectionId, endpoint });
    setEndpointDrag({
      connectionId,
      endpoint,
      point: toCanvasPoint(event.clientX, event.clientY),
    });
    onStateChange(selectCanvasItem(state, { kind: 'connection', id: connectionId }));
  };

  const endDrag = () => {
    if (dragTarget?.kind === 'connection-endpoint' && endpointDrag) {
      const targetNodeId = nodeAtPoint(endpointDrag.point);
      if (targetNodeId) {
        onStateChange(
          reconnectConnectionEndpoint(state, dragTarget.id, dragTarget.endpoint, targetNodeId),
        );
      }
    }
    setDragTarget(undefined);
    setEndpointDrag(undefined);
    panStartRef.current = undefined;
  };

  const changeZoom = (delta: number) => {
    setZoom((value) => Math.min(2, Math.max(0.65, Number((value + delta).toFixed(2)))));
  };

  return (
    <>
      <section
        className="canvas-region"
        aria-label="Canvas"
        ref={canvasRegionRef}
        style={activeTheme === 'monochrome' ? { background: '#ffffff' } : undefined}
      >
        <svg
          ref={svgRef}
          className={[
            'preview-canvas',
            isSpaceDown ? 'space-panning' : '',
            dragTarget ? 'canvas-dragging' : '',
          ].filter(Boolean).join(' ')}
          viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
          role="img"
          onDragOver={(event) => event.preventDefault()}
          onDrop={onDrop}
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) {
              if (isSpaceDown) {
                beginPan(event);
              } else {
                onStateChange(clearSelection(state));
              }
            }
          }}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerLeave={endDrag}
        >
        <defs>
          {state.connections.map((connection) => {
            const isSameColor = (c1: string, c2: string) => {
              if (c1 === c2) return true;
              if (!c1 || !c2) return false;
              return c1.toLowerCase() === c2.toLowerCase();
            };
            const connectionStrokeColor =
              activeTheme === 'monochrome' && isSameColor(connection.props.strokeColor, connectionDefaults.strokeColor)
                ? '#000000'
                : connection.props.strokeColor;
            return (
              <LineMarkerDefs
                key={connection.id}
                color={connectionStrokeColor}
                markerSize={connection.props.arrowSize}
                idSuffix={connection.id}
              />
            );
          })}
        </defs>
        {state.groups.map((group) => {
          const layoutGroup = sharedGroupsById.get(group.id);
          const groupPosition = layoutGroup
            ? { x: layoutGroup.x, y: layoutGroup.y }
            : group.position;
          const groupSize = layoutGroup
            ? { width: layoutGroup.width, height: layoutGroup.height }
            : group.size;
          const isMonochrome = activeTheme === 'monochrome';
          const groupStyle = isMonochrome ? {
            fill: 'none',
            stroke: '#000000',
            strokeWidth: 0.75,
            strokeDasharray: '4 4',
            // Capture pointer events across the whole box even when unfilled,
            // otherwise the group can only be grabbed by its thin border.
            pointerEvents: 'all' as const,
          } : {
            fill: group.fillColor,
            pointerEvents: 'all' as const,
          };

          return (
            <g
              key={group.id}
              className={state.selected?.kind === 'group' && state.selected.id === group.id ? 'preview-group selected' : 'preview-group'}
              onPointerDown={(event) => beginDrag(event, { kind: 'group', id: group.id }, groupPosition)}
            >
              <rect
                x={groupPosition.x}
                y={groupPosition.y}
                width={groupSize.width}
                height={groupSize.height}
                rx="8"
                className="group-box"
                style={groupStyle}
              />
              <text
                x={groupPosition.x + 12}
                y={groupPosition.y + 22}
                className="group-label"
                style={{
                  fill: isMonochrome ? '#000000' : group.labelColor,
                  fontSize: group.labelSize,
                }}
              >
                {group.label}
              </text>
              <rect
                x={groupPosition.x + groupSize.width - 12}
                y={groupPosition.y + groupSize.height - 12}
                width="12"
                height="12"
                rx="2"
                className="group-resize-handle"
                onPointerDown={(event) => beginGroupResize(event, group.id)}
              />
            </g>
          );
        })}
        <AttachmentOverlay slots={slots} boxes={boxes} showLabels={false} />
        <g id="preview-edge-shafts">
          {renderedConnections.map(({ connection, shaftPoints, shaftPath, connectionStrokeColor }) => (
            <Line
              key={`shaft-${connection.id}`}
              points={shaftPoints}
              pathData={shaftPath}
              lineStyle={connection.props.lineStyle}
              strokeColor={connectionStrokeColor}
              strokeWidth={connection.props.strokeWidth}
              startMarker="none"
              endMarker="none"
            />
          ))}
        </g>
        <g id="preview-edge-markers">
          {renderedConnections.map(({ connection, hasMarkers, markerCarrierPath }) => (
            hasMarkers ? (
              <path
                key={`markers-${connection.id}`}
                d={markerCarrierPath}
                fill="none"
                stroke="transparent"
                strokeWidth="0.01"
                pointerEvents="none"
                markerStart={markerUrl(connection.props.startMarker, 'start', connection.id)}
                markerEnd={markerUrl(connection.props.endMarker, 'end', connection.id)}
              />
            ) : null
          ))}
        </g>
        <g id="preview-edge-bridge-masks">
          {renderedConnections.map(({ connection, bridgeMaskPath }) => (
            bridgeMaskPath ? (
              <Line
                key={`bridge-mask-${connection.id}`}
                points={[]}
                pathData={bridgeMaskPath}
                strokeColor={themeTokens.background}
                strokeWidth={connection.props.strokeWidth + 3}
              />
            ) : null
          ))}
        </g>
        <g id="preview-edge-bridges">
          {renderedConnections.map(({ connection, bridgeMaskPath, connectionStrokeColor }) => (
            bridgeMaskPath ? (
              <Line
                key={`bridge-${connection.id}`}
                points={[]}
                pathData={bridgeMaskPath}
                strokeColor={connectionStrokeColor}
                strokeWidth={connection.props.strokeWidth}
              />
            ) : null
          ))}
        </g>
        <g id="preview-edge-labels">
          {renderedConnections.map(({ connection, edge }) => (
            edge.label ? <EdgeLabel key={`label-${connection.id}`} edge={edge} theme={themeTokens} /> : null
          ))}
        </g>
        <g id="preview-edge-selections">
          {renderedConnections.map(({ connection, selected, shaftPath }) => (
            selected ? <path key={`selection-${connection.id}`} d={shaftPath} className="connection-selection" /> : null
          ))}
        </g>
        <g id="preview-edge-hits">
          {renderedConnections.map(({ connection, hitPath }) => (
            <path
              key={`hit-${connection.id}`}
              d={hitPath}
              className="connection-hit"
              onPointerDown={(event) => {
                event.stopPropagation();
                onStateChange(selectCanvasItem(state, { kind: 'connection', id: connection.id }));
              }}
            />
          ))}
        </g>
        {state.nodes.map((node) => {
          const box = renderedNodeBoxesById.get(node.id) ?? computeNodeBox(state, node.id);
          if (!box) {
            return null;
          }
          return (
            <g
              key={node.id}
              onPointerDown={(event) => beginDrag(event, { kind: 'node', id: node.id }, node.position)}
            >
              <rect
                x={box.x}
                y={box.y}
                width={box.width}
                height={box.height}
                className="node-hit-target"
              />
              {state.selected?.kind === 'node' && state.selected.id === node.id ? (
                <rect
                  x={box.x - selectionPadding(node.componentId)}
                  y={box.y - selectionPadding(node.componentId)}
                  width={box.width + selectionPadding(node.componentId) * 2}
                  height={box.height + selectionPadding(node.componentId) * 2}
                  rx={node.componentId === 'icon' || node.componentId === 'labelIcon' ? '6' : '10'}
                  className="selection-outline"
                />
              ) : null}
              {renderNode(state, node.id, activeTheme, box)}
            </g>
          );
        })}
        {(() => {
          if (state.selected?.kind !== 'connection') {
            return null;
          }
          const selectedId = state.selected.id;
          const rendered = renderedConnections.find((item) => item.connection.id === selectedId);
          const points = rendered?.edge.points;
          if (!points || points.length < 2) {
            return null;
          }
          const start = points[0]!;
          const end = points[points.length - 1]!;
          const dragging = endpointDrag?.connectionId === selectedId ? endpointDrag : undefined;
          const fixedAnchor = dragging?.endpoint === 'from' ? end : start;
          const startPos = dragging?.endpoint === 'from' ? dragging.point : start;
          const endPos = dragging?.endpoint === 'to' ? dragging.point : end;
          const hoverBox = dragging?.hoverNodeId
            ? renderedNodeBoxesById.get(dragging.hoverNodeId) ?? computeNodeBox(state, dragging.hoverNodeId)
            : undefined;
          return (
            <g className="connection-endpoints">
              {dragging ? (
                <line
                  x1={fixedAnchor.x}
                  y1={fixedAnchor.y}
                  x2={dragging.point.x}
                  y2={dragging.point.y}
                  className="connection-endpoint-rubber"
                />
              ) : null}
              {hoverBox ? (
                <rect
                  x={hoverBox.x - 4}
                  y={hoverBox.y - 4}
                  width={hoverBox.width + 8}
                  height={hoverBox.height + 8}
                  rx="10"
                  className="connection-endpoint-target"
                />
              ) : null}
              <circle
                cx={startPos.x}
                cy={startPos.y}
                r={6}
                className="connection-endpoint-handle"
                onPointerDown={(event) => beginEndpointDrag(event, selectedId, 'from')}
              />
              <circle
                cx={endPos.x}
                cy={endPos.y}
                r={6}
                className="connection-endpoint-handle"
                onPointerDown={(event) => beginEndpointDrag(event, selectedId, 'to')}
              />
            </g>
          );
        })()}
        {state.nodes.length === 0 && state.groups.length === 0 ? (
          <text x={viewport.width / 2} y={viewport.height / 2} textAnchor="middle" className="drop-hint">
            Drag components here
          </text>
        ) : null}
        </svg>
      </section>
      <div className="canvas-toolbar">
        <div className="canvas-toolbar-inner">
          <span className="material-symbols-outlined canvas-tool active" aria-hidden="true">near_me</span>
          <button
            type="button"
            className="preview-btn preview-btn-icon preview-btn-zoom"
            disabled={state.nodes.length === 0 && state.connections.length === 0 && state.groups.length === 0}
            aria-label="Clear canvas"
            onClick={() => onClear?.()}
          >
            <span className="material-symbols-outlined preview-btn-icon-glyph" aria-hidden="true">delete_sweep</span>
          </button>
          <span className="canvas-toolbar-divider" aria-hidden="true" />
          <button
            type="button"
            className="preview-btn preview-btn-icon preview-btn-zoom"
            aria-label="Zoom in"
            onClick={() => changeZoom(0.15)}
          >
            <span className="material-symbols-outlined preview-btn-icon-glyph" aria-hidden="true">zoom_in</span>
          </button>
          <button
            type="button"
            className="preview-btn preview-btn-icon preview-btn-zoom"
            aria-label="Zoom out"
            onClick={() => changeZoom(-0.15)}
          >
            <span className="material-symbols-outlined preview-btn-icon-glyph" aria-hidden="true">zoom_out</span>
          </button>
          <span className="canvas-zoom-readout">{Math.round(zoom * 100)}%</span>
        </div>
      </div>
    </>
  );
}

function selectionPadding(componentId: string): number {
  return componentId === 'icon' || componentId === 'labelIcon' ? 4 : 8;
}

function zoomViewBox(
  zoom: number,
  pan: { x: number; y: number },
  viewport: { width: number; height: number },
) {
  const width = viewport.width / zoom;
  const height = viewport.height / zoom;
  return {
    x: (viewport.width - width) / 2 + pan.x,
    y: (viewport.height - height) / 2 + pan.y,
    width,
    height,
  };
}

function selectNearestConnection(state: WorkbenchState, point: { x: number; y: number }): WorkbenchState {
  let nearest: { id: string; distance: number } | undefined;
  for (const connection of state.connections) {
    const center = computeConnectionCenter(state, connection.id);
    if (!center) {
      continue;
    }
    const distance = Math.hypot(center.x - point.x, center.y - point.y);
    if (!nearest || distance < nearest.distance) {
      nearest = { id: connection.id, distance };
    }
  }

  return nearest
    ? selectCanvasItem(state, { kind: 'connection', id: nearest.id })
    : state;
}

function nearestConnectionAtPoint(
  state: WorkbenchState,
  point: { x: number; y: number },
  threshold = 18,
): { id: string; distance: number } | undefined {
  let nearest: { id: string; distance: number } | undefined;

  for (const connection of state.connections) {
    const points = computeConnectionPoints(state, connection);
    for (let index = 1; index < points.length; index++) {
      const distance = distanceToSegment(point, points[index - 1]!, points[index]!);
      if (distance <= threshold && (!nearest || distance < nearest.distance)) {
        nearest = { id: connection.id, distance };
      }
    }
  }

  return nearest;
}

function distanceToSegment(
  point: { x: number; y: number },
  start: { x: number; y: number },
  end: { x: number; y: number },
): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) {
    return Math.hypot(point.x - start.x, point.y - start.y);
  }

  const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared));
  return Math.hypot(point.x - (start.x + t * dx), point.y - (start.y + t * dy));
}
