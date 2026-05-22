import type {
  LayoutedEdge,
  LayoutedGroup,
  LayoutedNode,
  ThemeTokens,
} from '../../layout-ir.js';

export interface NodeComponentProps {
  node: LayoutedNode;
  theme: ThemeTokens;
}

export interface EdgeComponentProps {
  edge: LayoutedEdge;
  theme: ThemeTokens;
}

export interface GroupComponentProps {
  group: LayoutedGroup;
  theme: ThemeTokens;
}

export type BorderStyle = 'none' | 'solid' | 'dashed' | 'dotted';

export type SizePreset = 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

export interface ComponentDimensions {
  width: number;
  height: number;
}

export type ComponentSize = SizePreset | ComponentDimensions;

export interface BoxStyleProps {
  backgroundColor?: string;
  radius?: number;
  borderStyle?: BorderStyle;
  borderColor?: string;
  borderWidth?: number;
  text?: string;
  textColor?: string;
  size?: ComponentSize;
}
