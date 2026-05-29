import { useCallback, useEffect, useRef, useState, type DragEvent, type MutableRefObject, type PointerEvent, type RefObject } from 'react';

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
import { BUILTIN_ICON_REGISTRY } from '../../renderer/components/index.js';

import { API_SIZE_PRESETS, APP_SIZE_PRESETS, DATABASE_SIZE_PRESETS, DOCUMENT_SIZE_PRESETS, WEBSITE_SIZE_PRESETS, LABEL_ICON_SIZE_PRESETS } from '../../renderer/components/styles.js';
import { catalogDefaultProps } from '../../renderer/themes/componentDefaults.js';
import { defaultTheme } from '../../renderer/themes/default.js';
import { toDarkTheme } from '../../renderer/themes/transforms.js';
import { connectionDefaults } from '../controls/defaults.js';
import {
  applyConnectionMarkerInsets,
  connectionCenter,
  connectionLabelIconEnd,
  computeConnectionCenter,
  computeConnectionPoints,
  computeNodeBox,
  nodeResizeCenter,
  positionForResizeAnchor,
  previewLabelContentSize,
  previewLabelIconContentHeight,
  previewNodeSize,
} from '../geometry.js';
import {
  addCatalogItemToCanvas,
  clearSelection,
  deleteSelected,
  reconnectConnectionEndpoint,
  selectCanvasItem,
  setGroupPosition,
  setGroupPositions,
  setGroupSizeAndPosition,
  setNodeAttachedEnd,
  setNodePosition,
  setNodePositions,
  setNodeSize,
  setNodeSizeAndPosition,
  setSelectedItems,
  toggleNodeSelection,
  type CanvasSelection,
  type WorkbenchState,
  type CanvasNode,
  type CanvasConnection,
} from '../state.js';
import { autoLayoutWorkbenchState, serializeWorkbenchDocument } from '../persistence.js';

interface WorkbenchCanvasProps {
  state: WorkbenchState;
  onStateChange(state: WorkbenchState): void;
  onClear?(): void;
  onIconDrop?(): void;
  activeTheme?: 'light' | 'dark';
  loadTrigger?: number;
  isCatalogOpen?: boolean;
  isInspectorOpen?: boolean;
}

type DragTarget =
  | { kind: 'node'; id: string }
  | { kind: 'nodes' }
  | { kind: 'node-resize'; id: string }
  | { kind: 'group'; id: string }
  | { kind: 'group-resize'; id: string }
  | { kind: 'connection-endpoint'; id: string; endpoint: 'from' | 'to' }
  | { kind: 'marquee' }
  | { kind: 'pan' };

type MarqueeRect = { start: PreviewPoint; current: PreviewPoint };

function normalizedRect(a: PreviewPoint, b: PreviewPoint) {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    width: Math.abs(a.x - b.x),
    height: Math.abs(a.y - b.y),
  };
}

function rectsIntersect(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function pointInRect(p: PreviewPoint, rect: { x: number; y: number; width: number; height: number }): boolean {
  return p.x >= rect.x && p.x <= rect.x + rect.width && p.y >= rect.y && p.y <= rect.y + rect.height;
}

function segmentsCross(p1: PreviewPoint, p2: PreviewPoint, p3: PreviewPoint, p4: PreviewPoint): boolean {
  const cross = (a: PreviewPoint, b: PreviewPoint, c: PreviewPoint) =>
    (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  const d1 = cross(p3, p4, p1);
  const d2 = cross(p3, p4, p2);
  const d3 = cross(p1, p2, p3);
  const d4 = cross(p1, p2, p4);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

function polylineIntersectsRect(
  points: PreviewPoint[],
  rect: { x: number; y: number; width: number; height: number },
): boolean {
  const corners = [
    { x: rect.x, y: rect.y },
    { x: rect.x + rect.width, y: rect.y },
    { x: rect.x + rect.width, y: rect.y + rect.height },
    { x: rect.x, y: rect.y + rect.height },
  ];
  for (let index = 0; index < points.length - 1; index++) {
    const a = points[index]!;
    const b = points[index + 1]!;
    if (pointInRect(a, rect) || pointInRect(b, rect)) {
      return true;
    }
    for (let edge = 0; edge < 4; edge++) {
      if (segmentsCross(a, b, corners[edge]!, corners[(edge + 1) % 4]!)) {
        return true;
      }
    }
  }
  return false;
}

const MIN_NODE_WIDTH = 24;
const MIN_NODE_HEIGHT = 20;
const MIN_GROUP_WIDTH = 120;
const MIN_GROUP_HEIGHT = 80;

type EndpointDrag = {
  connectionId: string;
  endpoint: 'from' | 'to';
  point: PreviewPoint;
  hoverNodeId?: string;
};

const DEFAULT_VIEWPORT = { width: 960, height: 640 };
const ATTACHED_LABEL_GAP_X = 4;
const ATTACHED_LABEL_GAP_Y = 3;
// Icon-label nodes read better a touch smaller than the sm preset the first
// time they're dropped onto a line (20% down from the standalone sm size).
const DROPPED_LABEL_ICON_SIZE = {
  width: LABEL_ICON_SIZE_PRESETS.sm.width * 0.8,
  height: LABEL_ICON_SIZE_PRESETS.sm.height * 0.8,
};

type PreviewPoint = { x: number; y: number };

interface MaskRect { x: number; y: number; width: number; height: number; }

// Rectangles (in canvas space) where the connection stroke must be knocked out
// because an attached label / icon-label node sits on the line. We mask the
// stroke rather than splitting the path: it is robust to orientation, routing
// and the node sitting near an endpoint, and never lets the line pierce the node.
export function attachedLabelMaskRects(
  state: WorkbenchState,
  connection: CanvasConnection,
  getNodeBox: (nodeId: string) => ReturnType<typeof computeNodeBox> = (nodeId) => computeNodeBox(state, nodeId),
): MaskRect[] {
  const rects: MaskRect[] = [];
  for (const node of state.nodes) {
    if (node.attachedConnectionId !== connection.id) {
      continue;
    }
    const isLabel = node.componentId === 'label';
    const isLabelIcon = node.componentId === 'labelIcon';
    if (!isLabel && !isLabelIcon) {
      continue;
    }
    const box = getNodeBox(node.id);
    if (!box) {
      continue;
    }

    if (isLabelIcon) {
      // The visible content (icon + text) is top-aligned in the box; the box may
      // carry dead space below it from the size-preset minimum, so knock out the
      // tight content height, not the padded box height.
      const contentHeight = previewLabelIconContentHeight(node);
      rects.push({
        x: box.x - ATTACHED_LABEL_GAP_X,
        y: box.y - ATTACHED_LABEL_GAP_Y,
        width: box.width + ATTACHED_LABEL_GAP_X * 2,
        height: contentHeight + ATTACHED_LABEL_GAP_Y * 2,
      });
    } else {
      // Text label: knock out the wrapped text, centred on the box.
      const content = previewLabelContentSize(node);
      rects.push({
        x: box.x + box.width / 2 - content.width / 2 - ATTACHED_LABEL_GAP_X,
        y: box.y + box.height / 2 - content.height / 2 - ATTACHED_LABEL_GAP_Y,
        width: content.width + ATTACHED_LABEL_GAP_X * 2,
        height: content.height + ATTACHED_LABEL_GAP_Y * 2,
      });
    }
  }
  return rects;
}

// Bounding rect for a connection's mask: the line plus its knock-out rects,
// padded so the white "show everything" backdrop fully covers the stroke.
export function maskCoverageBounds(points: PreviewPoint[], rects: MaskRect[]): MaskRect {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  for (const r of rects) {
    minX = Math.min(minX, r.x);
    minY = Math.min(minY, r.y);
    maxX = Math.max(maxX, r.x + r.width);
    maxY = Math.max(maxY, r.y + r.height);
  }
  const pad = 32;
  return { x: minX - pad, y: minY - pad, width: maxX - minX + pad * 2, height: maxY - minY + pad * 2 };
}

function resolvePreviewTheme(
  activeTheme: 'light' | 'dark',
): ThemeTokens {
  if (activeTheme === 'dark') {
    return toDarkTheme(defaultTheme);
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

  // Measure nodes exactly as the export renderer does (renderToSVG/PNG/PDF all go
  // through measureNodes). The preview MUST share the renderer's sizing or the
  // layout engine routes edges around boxes that don't match what gets drawn.
  // Do NOT substitute previewNodeSize here: it imposes catalog-default minimums
  // (e.g. a 140px-wide box floor) the renderer doesn't, so edges get routed for
  // inflated boxes sitting at positions computed for content-fit sizes — which
  // shows up as overshooting, jagged connectors in the canvas only.
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
): ReturnType<typeof computeNodeBox> {
  const node = state.nodes.find((item) => item.id === nodeId);
  if (!node) {
    return undefined;
  }

  if (!node.attachedConnectionId) {
    return computeNodeBox(state, nodeId);
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
  activeTheme: 'light' | 'dark',
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
    effective.subtitleColor = activeTheme === 'dark' ? '#cbd5e1' : defaultProps.subtitleColor;
  }

  if (isSameColor(effective.iconColor || '', defaultProps.iconColor || '')) {
    effective.iconColor = activeTheme === 'dark' ? '#a78bfa' : defaultProps.iconColor;
  }

  if (
    node.componentId === 'website' &&
    isSameColor(effective.skeletonColor || '', defaultProps.skeletonColor || '')
  ) {
    effective.skeletonColor = activeTheme === 'dark' ? '#52525b' : defaultProps.skeletonColor;
  }

  if (effective.shadow === defaultProps.shadow) {
    effective.shadow = shapeStyle.shadow ? 'cast' : 'none';
  }

  return effective;
}

function renderNode(
  state: WorkbenchState,
  nodeId: string,
  activeTheme: 'light' | 'dark' = 'light',
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
  const getPreviewIcon = (iconName: string | undefined) => {
    if (iconName) {
      if (BUILTIN_ICON_REGISTRY[iconName]) {
        return BUILTIN_ICON_REGISTRY[iconName];
      }
      if (iconName.startsWith('default:')) {
        const name = iconName.split(':')[1];
        if (name && BUILTIN_ICON_REGISTRY[name]) {
          return BUILTIN_ICON_REGISTRY[name];
        }
      }
      return previewIconForName(iconName);
    }
    return previewIcon;
  };
  const iconProps =
    node.componentId === 'icon' || node.componentId === 'labelIcon'
      ? { icon: getPreviewIcon(effectiveProps.iconName ? String(effectiveProps.iconName) : undefined) }
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
      className={state.selectedNodeIds.includes(node.id) ? 'preview-node selected' : 'preview-node'}
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
    </g>
  );
}

function getDiagramBounds(state: WorkbenchState) {
  if (state.nodes.length === 0 && state.groups.length === 0) {
    return null;
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const node of state.nodes) {
    const box = computeNodeBox(state, node.id);
    if (box) {
      minX = Math.min(minX, box.x);
      minY = Math.min(minY, box.y);
      maxX = Math.max(maxX, box.x + box.width);
      maxY = Math.max(maxY, box.y + box.height);
    }
  }

  for (const group of state.groups) {
    minX = Math.min(minX, group.position.x);
    minY = Math.min(minY, group.position.y);
    maxX = Math.max(maxX, group.position.x + group.size.width);
    maxY = Math.max(maxY, group.position.y + group.size.height);
  }

  if (minX === Infinity || minY === Infinity) {
    return null;
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

const LEFT_SIDEBAR_OBSTRUCTED = 290;
const RIGHT_SIDEBAR_OBSTRUCTED = 330;
// The canvas-region is offset by var(--preview-topbar-height) (64px) at the top,
// so the topbar does not overlap/obstruct any of the canvas SVG area.
const TOPBAR_OBSTRUCTED = 0;
// Fallback when the toolbar cannot be measured in the DOM.
const ZOOM_BAR_OBSTRUCTED = 88;

const FIT_PADDING = {
  top: 40,
  right: 40,
  bottom: 56,
  left: 40,
} as const;

type CanvasViewport = { width: number; height: number };

type CanvasObstructions = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

export function measureCanvasObstructions(options: {
  viewport: CanvasViewport;
  canvasRegion: HTMLElement | null;
  toolbar: HTMLElement | null;
  isCatalogOpen: boolean;
  isInspectorOpen: boolean;
}): CanvasObstructions {
  const left = options.isCatalogOpen ? LEFT_SIDEBAR_OBSTRUCTED : 0;
  const right = options.isInspectorOpen ? RIGHT_SIDEBAR_OBSTRUCTED : 0;
  const top = TOPBAR_OBSTRUCTED;
  let bottom = ZOOM_BAR_OBSTRUCTED;

  if (options.canvasRegion && options.toolbar) {
    const canvasRect = options.canvasRegion.getBoundingClientRect();
    const toolbarRect = options.toolbar.getBoundingClientRect();
    const overlap = canvasRect.bottom - toolbarRect.top;
    if (overlap > 0) {
      bottom = Math.max(bottom, Math.ceil(overlap + 16));
    }
  }

  return {
    left: Math.min(left, Math.max(0, options.viewport.width - 120)),
    right: Math.min(right, Math.max(0, options.viewport.width - 120)),
    top,
    bottom: Math.min(bottom, Math.max(0, options.viewport.height - 120)),
  };
}

function animateCanvasFit(options: {
  state: WorkbenchState;
  viewport: CanvasViewport;
  canvasRegion: HTMLElement | null;
  toolbar: HTMLElement | null;
  isCatalogOpen: boolean;
  isInspectorOpen: boolean;
  zoomRef: RefObject<number>;
  panRef: RefObject<{ x: number; y: number }>;
  setZoom(value: number): void;
  setPan(value: { x: number; y: number }): void;
  animateFrameRef: MutableRefObject<number | null>;
  cancelCenteringAnimation(): void;
}) {
  const {
    state,
    viewport,
    canvasRegion,
    toolbar,
    isCatalogOpen,
    isInspectorOpen,
    zoomRef,
    panRef,
    setZoom,
    setPan,
    animateFrameRef,
    cancelCenteringAnimation,
  } = options;

  if (viewport.width <= 100 || viewport.height <= 100) {
    return;
  }

  const bounds = getDiagramBounds(state);
  if (!bounds || bounds.width <= 0 || bounds.height <= 0) {
    return;
  }

  const obstructions = measureCanvasObstructions({
    viewport,
    canvasRegion,
    toolbar,
    isCatalogOpen,
    isInspectorOpen,
  });

  const fitLeft = obstructions.left + FIT_PADDING.left;
  const fitTop = obstructions.top + FIT_PADDING.top;
  const fitRight = viewport.width - obstructions.right - FIT_PADDING.right;
  const fitBottom = viewport.height - obstructions.bottom - FIT_PADDING.bottom;
  const fitWidth = fitRight - fitLeft;
  const fitHeight = fitBottom - fitTop;

  if (fitWidth <= 40 || fitHeight <= 40) {
    return;
  }

  const rawZoom = Math.min(fitWidth / bounds.width, fitHeight / bounds.height);
  const nextZoom = Math.min(3, Math.max(0.65, Number(rawZoom.toFixed(2))));

  const boundsCenterX = bounds.x + bounds.width / 2;
  const boundsCenterY = bounds.y + bounds.height / 2;
  const fitCenterX = (fitLeft + fitRight) / 2;
  const fitCenterY = (fitTop + fitBottom) / 2;

  const panX = boundsCenterX - fitCenterX / nextZoom - (viewport.width - viewport.width / nextZoom) / 2;
  const panY = boundsCenterY - fitCenterY / nextZoom - (viewport.height - viewport.height / nextZoom) / 2;

  cancelCenteringAnimation();

  const startZoom = zoomRef.current;
  const startPan = { ...panRef.current };
  const targetZoom = nextZoom;
  const targetPan = { x: panX, y: panY };

  const startTime = performance.now();
  const duration = 500;

  const tick = (now: number) => {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 5);

    const currentZoom = startZoom + (targetZoom - startZoom) * ease;
    const currentPan = {
      x: startPan.x + (targetPan.x - startPan.x) * ease,
      y: startPan.y + (targetPan.y - startPan.y) * ease,
    };

    setZoom(currentZoom);
    setPan(currentPan);

    if (progress < 1) {
      animateFrameRef.current = requestAnimationFrame(tick);
    } else {
      animateFrameRef.current = null;
    }
  };

  animateFrameRef.current = requestAnimationFrame(tick);
}

export function WorkbenchCanvas({ state, onStateChange, onClear, onIconDrop, activeTheme = 'light', loadTrigger, isCatalogOpen, isInspectorOpen }: WorkbenchCanvasProps) {
  const canvasRegionRef = useRef<HTMLElement | null>(null);
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const panStartRef = useRef<{ clientX: number; clientY: number; pan: { x: number; y: number } } | undefined>(undefined);
  const [dragTarget, setDragTarget] = useState<DragTarget | undefined>();
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [endpointDrag, setEndpointDrag] = useState<EndpointDrag | undefined>();
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [viewport, setViewport] = useState(DEFAULT_VIEWPORT);
  const [isSpaceDown, setIsSpaceDown] = useState(false);
  const [panMode, setPanMode] = useState(false);
  const [marquee, setMarquee] = useState<MarqueeRect | undefined>();
  const [isAutoLayouting, setIsAutoLayouting] = useState(false);
  const multiDragRef = useRef<
    { start: PreviewPoint; nodes: Map<string, PreviewPoint>; groups: Map<string, PreviewPoint> } | undefined
  >(undefined);
  // Centre-anchored, aspect-locked resize: the body centre and aspect ratio
  // captured at drag start stay fixed for the whole gesture.
  const resizeRef = useRef<
    { center: PreviewPoint; baseWidth: number; baseHeight: number } | undefined
  >(undefined);
  const groupResizeRef = useRef<
    { center: PreviewPoint; baseWidth: number; baseHeight: number } | undefined
  >(undefined);
  const viewBox = zoomViewBox(zoom, pan, viewport);

  const zoomRef = useRef(zoom);
  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  const panRef = useRef(pan);
  useEffect(() => {
    panRef.current = pan;
  }, [pan]);

  const animateFrameRef = useRef<number | null>(null);

  const cancelCenteringAnimation = () => {
    if (animateFrameRef.current !== null) {
      cancelAnimationFrame(animateFrameRef.current);
      animateFrameRef.current = null;
    }
  };

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      if (animateFrameRef.current !== null) {
        cancelAnimationFrame(animateFrameRef.current);
      }
    };
  }, []);

  const lastAppliedTriggerRef = useRef(-1);
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const fitCanvasToView = useCallback((targetState: WorkbenchState) => {
    animateCanvasFit({
      state: targetState,
      viewport,
      canvasRegion: canvasRegionRef.current,
      toolbar: toolbarRef.current,
      isCatalogOpen: isCatalogOpen ?? true,
      isInspectorOpen: isInspectorOpen ?? true,
      zoomRef,
      panRef,
      setZoom,
      setPan,
      animateFrameRef,
      cancelCenteringAnimation,
    });
  }, [viewport, isCatalogOpen, isInspectorOpen]);

  useEffect(() => {
    if (loadTrigger === undefined || loadTrigger === lastAppliedTriggerRef.current) {
      return;
    }

    lastAppliedTriggerRef.current = loadTrigger;
    fitCanvasToView(stateRef.current);
  }, [loadTrigger, fitCanvasToView]);

  const handleAutoLayout = async () => {
    if (isAutoLayouting || state.nodes.length === 0) {
      return;
    }

    setIsAutoLayouting(true);
    try {
      cancelCenteringAnimation();
      const layouted = await autoLayoutWorkbenchState(state);
      onStateChange(layouted);
      requestAnimationFrame(() => {
        fitCanvasToView(layouted);
      });
    } finally {
      setIsAutoLayouting(false);
    }
  };

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) {
      return;
    }

    const handleWheel = (event: WheelEvent) => {
      cancelCenteringAnimation();
      const currentZoom = zoomRef.current;
      const isZoomGesture = event.ctrlKey || event.metaKey;

      event.preventDefault();

      if (isZoomGesture) {
        const delta = -event.deltaY * 0.01;
        setZoom((value) => Math.min(3, Math.max(0.65, Number((value + delta).toFixed(2)))));
        return;
      }

      setPan((prev) => ({
        x: prev.x + event.deltaX / currentZoom,
        y: prev.y + event.deltaY / currentZoom,
      }));
    };

    const handlePointerDownCapture = () => {
      cancelCenteringAnimation();
    };

    svg.addEventListener('wheel', handleWheel, { passive: false });
    svg.addEventListener('pointerdown', handlePointerDownCapture, { capture: true });
    return () => {
      svg.removeEventListener('wheel', handleWheel);
      svg.removeEventListener('pointerdown', handlePointerDownCapture, { capture: true });
    };
  }, []);
  const themeTokens = resolvePreviewTheme(activeTheme);
  const labelLayoutNodes = previewLayoutNodes(state);
  const sharedLayout = sharedPreviewLayout(state);
  const renderedEdgesByConnectionId = new Map(
    state.connections.flatMap((connection, index) => {
      const edge = sharedLayout?.edges[index];
      return edge ? [[connection.id, edge] as const] : [];
    }),
  );
  const renderedNodeBoxesById = new Map(
    state.nodes.flatMap((node) => {
      const box = renderedNodeBox(state, node.id, renderedEdgesByConnectionId);
      return box ? [[node.id, box] as const] : [];
    }),
  );
  const renderedConnections = state.connections.map((connection, index) => {
    const edge = sharedLayout?.edges[index] ?? previewLayoutEdge(state, connection, labelLayoutNodes);
    const markerCarrierPoints = edgeLineMarkerPoints(edge, {
      markerSize: connection.props.arrowSize,
    });
    const markerCarrierPath = edgeMarkerCarrierPathData(edge, {
      markerSize: connection.props.arrowSize,
    });
    const shaftPoints = applyConnectionMarkerInsets(markerCarrierPoints, connection.props);
    const shaftPath = edgeLinePathData(edge, {
      trimForMarkers: true,
      markerSize: connection.props.arrowSize,
    });
    // Attached label / icon-label nodes knock the stroke out via an SVG mask
    // (drawn full, masked where the node sits) rather than by splitting the path.
    const maskRects = attachedLabelMaskRects(
      state,
      connection,
      (nodeId) => renderedNodeBoxesById.get(nodeId) ?? computeNodeBox(state, nodeId),
    );
    const maskBounds = maskRects.length ? maskCoverageBounds(shaftPoints, maskRects) : undefined;
    const hitPath = linePathData(edge.points);
    const bridgeMaskPath = edgeBridgeMaskPathData(edge);
    const hasMarkers =
      connection.props.startMarker !== 'none' || connection.props.endMarker !== 'none';
    const selected = state.selectedConnectionIds.includes(connection.id);
    const isSameColor = (c1: string, c2: string) => {
      if (c1 === c2) return true;
      if (!c1 || !c2) return false;
      return c1.toLowerCase() === c2.toLowerCase();
    };
    const connectionStrokeColor =
      activeTheme === 'dark' && isSameColor(connection.props.strokeColor, connectionDefaults.strokeColor)
        ? themeTokens.edge.stroke
        : connection.props.strokeColor;

    return {
      connection,
      edge,
      shaftPoints,
      shaftPath,
      maskRects,
      maskBounds,
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
        if (state.selected || state.selectedNodeIds.length > 0) {
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

  // Nearest connection to a point, measured against the *rendered* edge geometry
  // (what the user sees) so dropping an icon onto a line is detected reliably.
  const nearestRenderedConnectionAtPoint = (point: PreviewPoint, threshold = 20): string | undefined => {
    let nearestId: string | undefined;
    let nearestDistance = threshold;
    for (const { connection, edge } of renderedConnections) {
      const points = edge.points;
      for (let index = 1; index < points.length; index++) {
        const distance = distanceToSegment(point, points[index - 1]!, points[index]!);
        if (distance <= nearestDistance) {
          nearestDistance = distance;
          nearestId = connection.id;
        }
      }
    }
    return nearestId;
  };

  const onDrop = (event: DragEvent<SVGSVGElement>) => {
    event.preventDefault();
    const iconPayload = event.dataTransfer.getData('application/x-cora-icon');
    let iconProps: Record<string, unknown> | undefined;
    const point = toCanvasPoint(event.clientX, event.clientY);
    const nearestConnectionId = iconPayload ? nearestRenderedConnectionAtPoint(point) : undefined;
    let componentId = event.dataTransfer.getData('application/x-cora-component');

    if (iconPayload) {
      try {
        const parsed = JSON.parse(iconPayload) as { name: string; fullName: string };
        const isLabelIcon = Boolean(nearestConnectionId);
        iconProps = {
          title: isLabelIcon ? '' : parsed.name,
          subtitle: '',
          iconName: parsed.fullName,
          // Icons sitting on a line read better small; standalone icons stay large.
          size: isLabelIcon ? DROPPED_LABEL_ICON_SIZE : 'lg',
          ...(isLabelIcon ? { titleFontSize: 28 } : {}),
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
      nearestConnectionId
        ? selectCanvasItem(state, { kind: 'connection', id: nearestConnectionId })
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
      : componentId === 'labelIcon' ? DROPPED_LABEL_ICON_SIZE
      : componentId === 'box' ? { width: 140, height: 37 }
      : { width: 176, height: 72 };
    let nextState = addCatalogItemToCanvas(dropState, componentId, {
      x: Math.max(16, point.x - dropSize.width / 2),
      y: Math.max(16, point.y - dropSize.height / 2),
    }, props);
    // Pin the icon to whichever end of the line it was dropped near, so moving
    // the connected boxes later never flips it to the other side.
    if (componentId === 'labelIcon') {
      const newNode = nextState.selected?.kind === 'node'
        ? nextState.nodes.find((node) => node.id === nextState.selected!.id)
        : undefined;
      if (newNode?.attachedConnectionId) {
        const end = connectionLabelIconEnd(nextState, newNode.attachedConnectionId, point);
        if (end) {
          nextState = setNodeAttachedEnd(nextState, newNode.id, end);
        }
      }
    }
    onStateChange(nextState);
    if (iconPayload) {
      onIconDrop?.();
    }
  };

  const onPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    if (!dragTarget || event.buttons !== 1) {
      return;
    }
    const currentState = stateRef.current;
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
    if (dragTarget.kind === 'marquee') {
      setMarquee((current) =>
        current ? { ...current, current: toCanvasPoint(event.clientX, event.clientY) } : current,
      );
      return;
    }
    if (dragTarget.kind === 'nodes') {
      const drag = multiDragRef.current;
      if (!drag) {
        return;
      }
      const point = toCanvasPoint(event.clientX, event.clientY);
      const delta = { x: point.x - drag.start.x, y: point.y - drag.start.y };
      const shift = ([id, origin]: [string, PreviewPoint]) => ({
        id,
        position: { x: origin.x + delta.x, y: origin.y + delta.y },
      });
      let next = setNodePositions(currentState, [...drag.nodes.entries()].map(shift));
      next = setGroupPositions(next, [...drag.groups.entries()].map(shift));
      onStateChange(next);
      return;
    }
    const point = toCanvasPoint(event.clientX, event.clientY);
    const position = {
      x: point.x - dragOffset.x,
      y: point.y - dragOffset.y,
    };
    if (dragTarget.kind === 'group-resize') {
      const group = currentState.groups.find((item) => item.id === dragTarget.id);
      if (!group) {
        return;
      }
      const resize = groupResizeRef.current;
      if (!resize || resize.baseWidth === 0 || resize.baseHeight === 0) {
        return;
      }
      const halfWidth = Math.max(MIN_GROUP_WIDTH / 2, Math.abs(point.x - resize.center.x));
      const halfHeight = Math.max(MIN_GROUP_HEIGHT / 2, Math.abs(point.y - resize.center.y));
      const width = halfWidth * 2;
      const height = halfHeight * 2;
      onStateChange(
        setGroupSizeAndPosition(currentState, group.id, { width, height }, {
          x: resize.center.x - width / 2,
          y: resize.center.y - height / 2,
        }),
      );
      return;
    }
    if (dragTarget.kind === 'node-resize') {
      const node = currentState.nodes.find((item) => item.id === dragTarget.id);
      if (!node) {
        return;
      }
      // Boxes resize from their top-left corner (free aspect ratio).
      if (node.componentId === 'box') {
        const box = computeNodeBox(currentState, node.id);
        if (!box) {
          return;
        }
        onStateChange(setNodeSize(currentState, node.id, {
          width: Math.max(MIN_NODE_WIDTH, point.x - box.x),
          height: Math.max(MIN_NODE_HEIGHT, point.y - box.y),
        }));
        return;
      }
      // Every other sizable node scales from its icon/body centre (excluding text).
      const resize = resizeRef.current;
      if (!resize || resize.baseWidth === 0 || resize.baseHeight === 0) {
        return;
      }
      const scaleX = Math.abs(point.x - resize.center.x) / (resize.baseWidth / 2);
      const scaleY = Math.abs(point.y - resize.center.y) / (resize.baseHeight / 2);
      const minScale = Math.max(MIN_NODE_WIDTH / resize.baseWidth, MIN_NODE_HEIGHT / resize.baseHeight);
      const scale = Math.max(scaleX, scaleY, minScale);
      const size = { width: resize.baseWidth * scale, height: resize.baseHeight * scale };

      if (node.attachedConnectionId) {
        // Attached labels are auto-centred on their line; only the size matters.
        onStateChange(setNodeSize(currentState, dragTarget.id, size));
        return;
      }
      onStateChange(
        setNodeSizeAndPosition(
          currentState,
          dragTarget.id,
          size,
          positionForResizeAnchor(currentState, dragTarget.id, resize.center, size),
        ),
      );
      return;
    }
    if (dragTarget.kind === 'node') {
      let next = setNodePosition(currentState, dragTarget.id, position);
      // Dragging an on-line icon past the midpoint re-pins it to the nearer end.
      const dragged = currentState.nodes.find((item) => item.id === dragTarget.id);
      if (dragged?.componentId === 'labelIcon' && dragged.attachedConnectionId) {
        const end = connectionLabelIconEnd(next, dragged.attachedConnectionId, point);
        if (end) {
          next = setNodeAttachedEnd(next, dragTarget.id, end);
        }
      }
      onStateChange(next);
      return;
    }
    onStateChange(setGroupPosition(currentState, dragTarget.id, position));
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

  const beginPan = (event: PointerEvent<Element>) => {
    svgRef.current?.setPointerCapture(event.pointerId);
    panStartRef.current = {
      clientX: event.clientX,
      clientY: event.clientY,
      pan,
    };
    setDragTarget({ kind: 'pan' });
  };

  const multiSelectionCount = () => state.selectedNodeIds.length + state.selectedGroupIds.length;

  const startMultiDrag = (event: PointerEvent<SVGGElement>) => {
    event.stopPropagation();
    svgRef.current?.setPointerCapture(event.pointerId);
    multiDragRef.current = {
      start: toCanvasPoint(event.clientX, event.clientY),
      nodes: new Map(
        state.nodes.filter((item) => state.selectedNodeIds.includes(item.id)).map((item) => [item.id, { ...item.position }]),
      ),
      groups: new Map(
        state.groups.filter((item) => state.selectedGroupIds.includes(item.id)).map((item) => [item.id, { ...item.position }]),
      ),
    };
    setDragTarget({ kind: 'nodes' });
  };

  const beginNodePointerDown = (event: PointerEvent<SVGGElement>, node: CanvasNode) => {
    // Shift/Cmd/Ctrl-click toggles the node in the multi-selection.
    if (event.shiftKey || event.metaKey || event.ctrlKey) {
      event.stopPropagation();
      onStateChange(toggleNodeSelection(state, node.id));
      return;
    }
    // Dragging any node in a multi-selection moves the whole set (nodes + groups).
    if (multiSelectionCount() > 1 && state.selectedNodeIds.includes(node.id)) {
      startMultiDrag(event);
      return;
    }
    beginDrag(event, { kind: 'node', id: node.id }, node.position);
  };

  const beginGroupPointerDown = (
    event: PointerEvent<SVGGElement>,
    groupId: string,
    groupPosition: { x: number; y: number },
  ) => {
    if (multiSelectionCount() > 1 && state.selectedGroupIds.includes(groupId)) {
      startMultiDrag(event);
      return;
    }
    beginDrag(event, { kind: 'group', id: groupId }, groupPosition);
  };

  const beginMarquee = (event: PointerEvent<SVGSVGElement>) => {
    const point = toCanvasPoint(event.clientX, event.clientY);
    svgRef.current?.setPointerCapture(event.pointerId);
    setMarquee({ start: point, current: point });
    setDragTarget({ kind: 'marquee' });
  };

  const beginGroupResize = (
    event: PointerEvent<SVGRectElement>,
    id: string,
  ) => {
    event.stopPropagation();
    svgRef.current?.setPointerCapture(event.pointerId);
    const group = state.groups.find((item) => item.id === id);
    if (group) {
      groupResizeRef.current = {
        center: {
          x: group.position.x + group.size.width / 2,
          y: group.position.y + group.size.height / 2,
        },
        baseWidth: group.size.width,
        baseHeight: group.size.height,
      };
    }
    setDragTarget({ kind: 'group-resize', id });
    onStateChange(selectCanvasItem(state, { kind: 'group', id }));
  };

  const beginNodeResize = (
    event: PointerEvent<SVGRectElement>,
    id: string,
  ) => {
    event.stopPropagation();
    event.preventDefault();
    svgRef.current?.setPointerCapture(event.pointerId);
    const currentState = stateRef.current;
    const node = currentState.nodes.find((item) => item.id === id);
    if (node) {
      const frame = previewNodeSize(node);
      const center = nodeResizeCenter(currentState, id) ?? {
        x: node.position.x + frame.width / 2,
        y: node.position.y + frame.height / 2,
      };
      resizeRef.current = {
        center,
        baseWidth: frame.width,
        baseHeight: frame.height,
      };
    }
    setDragTarget({ kind: 'node-resize', id });
    onStateChange(selectCanvasItem(currentState, { kind: 'node', id }));
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
    if (dragTarget?.kind === 'marquee' && marquee) {
      const rect = normalizedRect(marquee.start, marquee.current);
      if (rect.width < 3 && rect.height < 3) {
        // A plain click on empty canvas — clear the selection.
        onStateChange(clearSelection(state));
      } else {
        const nodeIds = state.nodes
          .filter((node) => {
            const box = renderedNodeBoxesById.get(node.id) ?? computeNodeBox(state, node.id);
            return box ? rectsIntersect(rect, box) : false;
          })
          .map((node) => node.id);
        const connectionIds = renderedConnections
          .filter(({ edge }) => polylineIntersectsRect(edge.points, rect))
          .map(({ connection }) => connection.id);
        const groupIds = state.groups
          .filter((group) =>
            rectsIntersect(rect, {
              x: group.position.x,
              y: group.position.y,
              width: group.size.width,
              height: group.size.height,
            }),
          )
          .map((group) => group.id);
        onStateChange(setSelectedItems(state, { nodeIds, connectionIds, groupIds }));
      }
    }
    multiDragRef.current = undefined;
    resizeRef.current = undefined;
    groupResizeRef.current = undefined;
    setMarquee(undefined);
    setDragTarget(undefined);
    setEndpointDrag(undefined);
    panStartRef.current = undefined;
  };

  const changeZoom = (delta: number) => {
    cancelCenteringAnimation();
    setZoom((value) => Math.min(3, Math.max(0.65, Number((value + delta).toFixed(2)))));
  };

  return (
    <>
      <section
        className="canvas-region"
        aria-label="Canvas"
        ref={canvasRegionRef}
      >
        <svg
          ref={svgRef}
          className={[
            'preview-canvas',
            isSpaceDown || panMode ? 'space-panning' : '',
            dragTarget ? 'canvas-dragging' : '',
          ].filter(Boolean).join(' ')}
          viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
          role="img"
          onDragOver={(event) => event.preventDefault()}
          onDrop={onDrop}
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) {
              if (isSpaceDown || panMode) {
                beginPan(event);
              } else {
                beginMarquee(event);
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
              activeTheme === 'dark' && isSameColor(connection.props.strokeColor, connectionDefaults.strokeColor)
                ? themeTokens.edge.stroke
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
          const groupPosition = group.position;
          const groupSize = group.size;
          const groupStyle = {
            fill: activeTheme === 'dark' && (group.fillColor === 'none' || group.fillColor === 'transparent') ? 'none' : group.fillColor,
            pointerEvents: 'all' as const,
          };

          const isGroupResizing = dragTarget?.kind === 'group-resize' && dragTarget.id === group.id;
          const groupClassName = [
            'preview-group',
            state.selectedGroupIds.includes(group.id) ? 'selected' : '',
            isGroupResizing ? 'resizing' : '',
          ].filter(Boolean).join(' ');
          return (
            <g
              key={group.id}
              className={groupClassName}
              onPointerDown={(event) => beginGroupPointerDown(event, group.id, groupPosition)}
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
                  fill: activeTheme === 'dark' && group.labelColor === '#0f172a' ? '#cbd5e1' : group.labelColor,
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
        <g id="preview-edge-shafts">
          {renderedConnections.map(({ connection, shaftPoints, shaftPath, connectionStrokeColor, maskRects, maskBounds }) => {
            const maskId = `shaft-mask-${connection.id}`;
            return (
              <g key={`shaft-${connection.id}`}>
                {maskBounds ? (
                  <mask
                    id={maskId}
                    maskUnits="userSpaceOnUse"
                    maskContentUnits="userSpaceOnUse"
                    x={maskBounds.x}
                    y={maskBounds.y}
                    width={maskBounds.width}
                    height={maskBounds.height}
                  >
                    <rect x={maskBounds.x} y={maskBounds.y} width={maskBounds.width} height={maskBounds.height} fill="white" />
                    {maskRects.map((rect, index) => (
                      <rect key={index} x={rect.x} y={rect.y} width={rect.width} height={rect.height} fill="black" />
                    ))}
                  </mask>
                ) : null}
                <g mask={maskBounds ? `url(#${maskId})` : undefined}>
                  <Line
                    points={shaftPoints}
                    pathData={shaftPath}
                    lineStyle={connection.props.lineStyle}
                    strokeColor={connectionStrokeColor}
                    strokeWidth={connection.props.strokeWidth}
                    startMarker="none"
                    endMarker="none"
                  />
                </g>
              </g>
            );
          })}
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
          const isResizing = dragTarget?.kind === 'node-resize' && dragTarget.id === node.id;
          const isSelected = state.selectedNodeIds.includes(node.id);
          return (
            <g
              key={node.id}
              className={[
                'node-interactive',
                isSelected ? 'selected' : '',
                isResizing ? 'resizing' : '',
              ].filter(Boolean).join(' ')}
              onPointerDown={(event) => beginNodePointerDown(event, node)}
            >
              <rect
                x={box.x}
                y={box.y}
                width={box.width}
                height={box.height}
                className="node-hit-target"
              />
              {isSelected ? (
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
              {node.componentId !== 'label' ? (
                <rect
                  x={box.x + box.width - 6}
                  y={box.y + box.height - 6}
                  width={9}
                  height={9}
                  rx={2}
                  className="node-resize-handle"
                  onPointerDown={(event) => beginNodeResize(event, node.id)}
                />
              ) : null}
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
        {marquee ? (() => {
          const rect = normalizedRect(marquee.start, marquee.current);
          return (
            <rect
              x={rect.x}
              y={rect.y}
              width={rect.width}
              height={rect.height}
              className="marquee-rect"
            />
          );
        })() : null}
        {panMode ? (
          <rect
            x={viewBox.x}
            y={viewBox.y}
            width={viewBox.width}
            height={viewBox.height}
            className="pan-overlay"
            onPointerDown={(event) => beginPan(event)}
          />
        ) : null}
        </svg>
      </section>
      <div className="canvas-toolbar" ref={toolbarRef}>
        <div className="canvas-toolbar-inner">
          <button
            type="button"
            className={`canvas-tool${panMode ? '' : ' active'}`}
            aria-label="Select tool"
            aria-pressed={!panMode}
            title="Select (V)"
            onClick={() => setPanMode(false)}
          >
            <span className="material-symbols-outlined" aria-hidden="true">near_me</span>
          </button>
          <button
            type="button"
            className={`canvas-tool${panMode ? ' active' : ''}`}
            aria-label="Pan tool"
            aria-pressed={panMode}
            title="Pan — drag to move the canvas (or hold Space)"
            onClick={() => setPanMode((value) => !value)}
          >
            <span className="material-symbols-outlined" aria-hidden="true">pan_tool</span>
          </button>
          <span className="canvas-toolbar-divider" aria-hidden="true" />
          <button
            type="button"
            className="preview-btn preview-btn-icon preview-btn-zoom"
            disabled={state.nodes.length === 0 || isAutoLayouting}
            aria-label="Auto layout and fit"
            title="Auto layout and fit"
            onClick={() => void handleAutoLayout()}
          >
            <span className="material-symbols-outlined preview-btn-icon-glyph" aria-hidden="true">account_tree</span>
          </button>
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
