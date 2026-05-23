import { useEffect, useRef, useState, type DragEvent, type PointerEvent } from 'react';

import { Line, linePathData } from '../../renderer/components/lines/Line.js';
import { LineMarkerDefs } from '../../renderer/components/lines/markers.js';
import { previewIcon } from '../pack/builtins.js';
import {
  applyConnectionMarkerInsets,
  computeConnectionCenter,
  computeConnectionPoints,
  computeNodeBox,
  computeSceneAttachmentSlots,
  previewNodeSize,
} from '../geometry.js';
import {
  addCatalogItemToCanvas,
  clearCanvas,
  clearSelection,
  deleteSelected,
  selectCanvasItem,
  setGroupPosition,
  setGroupSize,
  setNodePosition,
  type CanvasSelection,
  type WorkbenchState,
} from '../state.js';
import { AttachmentOverlay } from './AttachmentOverlay.js';
import { Button, Toggle } from './ui/index.js';

interface WorkbenchCanvasProps {
  state: WorkbenchState;
  onStateChange(state: WorkbenchState): void;
}

type DragTarget =
  | { kind: 'node'; id: string }
  | { kind: 'group'; id: string }
  | { kind: 'group-resize'; id: string }
  | { kind: 'pan' };

const CANVAS_WIDTH = 760;
const CANVAS_HEIGHT = 520;

function renderNode(state: WorkbenchState, nodeId: string) {
  const node = state.nodes.find((item) => item.id === nodeId);
  if (!node) {
    return null;
  }
  const box = computeNodeBox(state, node.id);
  if (!box) {
    return null;
  }
  const definition = state.pack.components.find((component) => component.id === node.componentId)!;
  const Component = definition.component;
  const iconProps =
    node.componentId === 'icon' || node.componentId === 'labelIcon'
      ? { icon: previewIcon }
      : {};
  const props = {
    ...node.props,
    size: previewNodeSize(node),
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
      {node.attachedConnectionId && node.componentId === 'label' ? (
        <rect
          x={box.x - 4}
          y={box.y - 3}
          width={box.width + 8}
          height={box.height + 6}
          rx="5"
          className="connection-label-mask"
        />
      ) : null}
      <Component {...props} />
    </g>
  );
}

export function WorkbenchCanvas({ state, onStateChange }: WorkbenchCanvasProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const panStartRef = useRef<{ clientX: number; clientY: number; pan: { x: number; y: number } } | undefined>(undefined);
  const [dragTarget, setDragTarget] = useState<DragTarget | undefined>();
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showOverlayLabels, setShowOverlayLabels] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isSpaceDown, setIsSpaceDown] = useState(false);
  const viewBox = zoomViewBox(zoom, pan);
  const slots = computeSceneAttachmentSlots(state);
  const boxes = state.nodes
    .filter((node) => node.componentId !== 'label' && node.componentId !== 'labelIcon')
    .map((node) => computeNodeBox(state, node.id))
    .filter(Boolean) as NonNullable<ReturnType<typeof computeNodeBox>>[];

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
  }, [dragTarget?.kind]);

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

  const onDrop = (event: DragEvent<SVGSVGElement>) => {
    event.preventDefault();
    const componentId = event.dataTransfer.getData('application/x-cora-component');
    if (!componentId) {
      return;
    }
    const point = toCanvasPoint(event.clientX, event.clientY);
    const dropState =
      (componentId === 'label' || componentId === 'labelIcon') && state.selected?.kind !== 'connection'
        ? selectNearestConnection(state, point)
        : state;
    onStateChange(addCatalogItemToCanvas(dropState, componentId, {
      x: Math.max(16, point.x - (componentId === 'group' ? 140 : 88)),
      y: Math.max(16, point.y - (componentId === 'group' ? 80 : 36)),
    }));
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

  const changeZoom = (delta: number) => {
    setZoom((value) => Math.min(2, Math.max(0.65, Number((value + delta).toFixed(2)))));
  };

  return (
    <section className="canvas-region" aria-label="Canvas">
      <div className="canvas-toolbar">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onStateChange(deleteSelected(state))}
          disabled={!state.selected}
        >
          Delete
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onStateChange(clearCanvas(state))}
          disabled={state.nodes.length === 0 && state.connections.length === 0 && state.groups.length === 0}
        >
          Clear
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => changeZoom(-0.15)}>
          -
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => changeZoom(0.15)}>
          +
        </Button>
        <Toggle
          type="button"
          pressed={showOverlayLabels}
          onClick={() => setShowOverlayLabels((value) => !value)}
          title="Toggle attachment slot labels"
        >
          Labels
        </Toggle>
      </div>
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
        onPointerUp={() => {
          setDragTarget(undefined);
          panStartRef.current = undefined;
        }}
        onPointerLeave={() => {
          setDragTarget(undefined);
          panStartRef.current = undefined;
        }}
      >
        <defs>
          {state.connections.map((connection) => (
            <LineMarkerDefs
              key={connection.id}
              color={connection.props.strokeColor}
              markerSize={connection.props.arrowSize}
              idSuffix={connection.id}
            />
          ))}
        </defs>
        {state.groups.map((group) => (
          <g
            key={group.id}
            className={state.selected?.kind === 'group' && state.selected.id === group.id ? 'preview-group selected' : 'preview-group'}
            onPointerDown={(event) => beginDrag(event, { kind: 'group', id: group.id }, group.position)}
          >
            <rect
              x={group.position.x}
              y={group.position.y}
              width={group.size.width}
              height={group.size.height}
              rx="8"
              className="group-box"
            />
            <text x={group.position.x + 12} y={group.position.y + 22} className="group-label">
              {group.label}
            </text>
            <rect
              x={group.position.x + group.size.width - 12}
              y={group.position.y + group.size.height - 12}
              width="12"
              height="12"
              rx="2"
              className="group-resize-handle"
              onPointerDown={(event) => beginGroupResize(event, group.id)}
            />
          </g>
        ))}
        <AttachmentOverlay slots={slots} boxes={boxes} showLabels={showOverlayLabels} />
        {state.connections.map((connection) => {
          const points = computeConnectionPoints(state, connection);
          const visiblePoints = applyConnectionMarkerInsets(points, connection.props);
          const path = linePathData(visiblePoints);
          const selected = state.selected?.kind === 'connection' && state.selected.id === connection.id;
          return (
          <g key={connection.id} className={selected ? 'preview-connection selected' : 'preview-connection'}>
            <Line
              points={visiblePoints}
              lineStyle={connection.props.lineStyle}
              strokeColor={connection.props.strokeColor}
              strokeWidth={connection.props.strokeWidth}
              startMarker={connection.props.startMarker}
              endMarker={connection.props.endMarker}
              markerIdSuffix={connection.id}
            />
            {selected ? (
              <path d={path} className="connection-selection" />
            ) : null}
            <path
              d={path}
              className="connection-hit"
              onPointerDown={(event) => {
                event.stopPropagation();
                onStateChange(selectCanvasItem(state, { kind: 'connection', id: connection.id }));
              }}
            />
          </g>
          );
        })}
        {state.nodes.map((node) => {
          const box = computeNodeBox(state, node.id);
          if (!box) {
            return null;
          }
          return (
            <g
              key={node.id}
              onPointerDown={(event) => beginDrag(event, { kind: 'node', id: node.id }, node.position)}
            >
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
              {renderNode(state, node.id)}
            </g>
          );
        })}
        {state.nodes.length === 0 && state.groups.length === 0 ? (
          <text x="380" y="260" textAnchor="middle" className="drop-hint">
            Drag components here
          </text>
        ) : null}
      </svg>
    </section>
  );
}

function selectionPadding(componentId: string): number {
  return componentId === 'icon' || componentId === 'labelIcon' ? 4 : 8;
}

function zoomViewBox(zoom: number, pan: { x: number; y: number }) {
  const width = CANVAS_WIDTH / zoom;
  const height = CANVAS_HEIGHT / zoom;
  return {
    x: (CANVAS_WIDTH - width) / 2 + pan.x,
    y: (CANVAS_HEIGHT - height) / 2 + pan.y,
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
