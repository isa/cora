export type DiagramKind =
  | 'box-arrows'
  | 'flowchart'
  | 'microservice'
  | 'infra'
  | 'database';

export type DiagramComponent =
  | 'box'
  | 'label'
  | 'icon'
  | 'labelIcon'
  | 'website'
  | 'document'
  | 'api'
  | 'database'
  | 'app';

export type EdgeMarker =
  | 'none'
  | 'arrow'
  | 'circle'
  | 'filledCircle'
  | 'diamond'
  | 'filledDiamond'
  | 'square'
  | 'filledSquare';

export interface ThemeShapeStyle {
  fill: string;
  stroke: string;
  shadow?: string;
  labelFill?: string;
  strokeWidth?: number;
  strokeDasharray?: string;
}

export interface ThemeTokens {
  background: string;
  shapes: Record<string, ThemeShapeStyle>;
  edge: { stroke: string; strokeWidth: number };
  nodeLabel: { fontSize: number; fontWeight: number; fill: string };
  edgeLabel: {
    fontSize: number;
    fontWeight: number;
    fill: string;
  };
  shadowOffset: { x: number; y: number };
  shadowBlur: number;
}

export interface ResolvedStyle extends ThemeShapeStyle {}

export interface DiagramGroupStyle {
  fill?: string;
  fillColor?: string;
  backgroundColor?: string;
  labelColor?: string;
  labelSize?: number;
  titleColor?: string;
  titleSize?: number;
}

export interface DiagramNode {
  id: string;
  label: string;
  component?: DiagramComponent;
  position?: { x: number; y: number };
  pinned?: boolean;
  icon?: string;
  provider?: string;
  service?: string;
  style?: Record<string, unknown>;
}

export interface MeasuredNode extends DiagramNode {
  measuredWidth: number;
  measuredHeight: number;
  resolvedStyle?: ResolvedStyle;
}

export interface LayoutedNode extends MeasuredNode {
  x: number;
  y: number;
}

export interface EdgeLabelPlacement {
  x: number;
  y: number;
  width: number;
  height: number;
  segmentIndex: number;
  orientation: 'horizontal' | 'vertical';
}

export interface EdgeBridge {
  x: number;
  y: number;
  segmentIndex: number;
  orientation: 'horizontal' | 'vertical';
}

export interface LayoutedEdge {
  from: string;
  to: string;
  label?: string;
  points: Array<{ x: number; y: number }>;
  labelX?: number;
  labelY?: number;
  labelPlacement?: EdgeLabelPlacement;
  bridges?: EdgeBridge[];
  startMarker?: EdgeMarker;
  endMarker?: EdgeMarker;
}

export interface LayoutedGroup {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  contains?: string[];
  style?: DiagramGroupStyle;
}

export interface LayoutedDiagram {
  kind: DiagramKind;
  nodes: LayoutedNode[];
  edges: LayoutedEdge[];
  groups?: LayoutedGroup[];
  width: number;
  height: number;
  theme: ThemeTokens;
}
