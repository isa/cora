import type { DiagramGroupStyle, EdgeMarker } from '../layout-ir.js';

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

export type ErrorCode =
  | 'SCHEMA_VIOLATION'
  | 'MISSING_EDGE_TARGET'
  | 'UNKNOWN_SERVICE'
  | 'MISSING_EXTENSION'
  | 'PARSE_ERROR'
  | 'LAYOUT_ERROR';

export interface StructuredError {
  code: ErrorCode;
  path: string;
  message: string;
  suggestion?: string;
}

export interface ParseResult {
  sourcePath: string;
  format: 'yaml' | 'json';
  document: unknown;
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

export interface DiagramEdge {
  from: string;
  to: string;
  label?: string;
  startMarker?: EdgeMarker;
  endMarker?: EdgeMarker;
}

export interface DiagramGroup {
  id: string;
  label: string;
  contains?: string[];
  style?: DiagramGroupStyle;
}

export interface Diagram {
  kind: DiagramKind;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  groups?: DiagramGroup[];
  theme?: string;
  layout?: 'auto' | 'preserve' | 'hybrid';
  direction?: 'LR' | 'TB';
  grid?: { spacing?: number; majorEvery?: number; visible?: boolean };
}

export interface DiagramFile {
  version: 1;
  diagram: Diagram;
}

export type {
  ThemeShapeStyle,
  ThemeTokens,
  ResolvedStyle,
  DiagramGroupStyle,
  EdgeMarker,
  MeasuredNode,
  LayoutedNode,
  LayoutedEdge,
  LayoutedGroup,
  LayoutedDiagram,
} from '../layout-ir.js';
