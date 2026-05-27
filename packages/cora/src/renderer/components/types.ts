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

export interface GroupStyleProps {
  fillColor?: string;
  backgroundColor?: string;
  labelColor?: string;
  labelSize?: number;
  titleColor?: string;
  titleSize?: number;
}

export type BorderStyle = 'none' | 'solid' | 'dashed' | 'dotted';

export type NodeShadow = 'none' | 'cast' | 'radial';

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
  title?: string;
  subtitle?: string;
  text?: string;
  textColor?: string;
  subtitleColor?: string;
  titleFontSize?: number;
  subtitleFontSize?: number;
  shadow?: NodeShadow;
  shadowColor?: string;
  size?: ComponentSize;
}

export type PageNodeType = 'landing' | 'form' | 'content' | 'profile' | 'settings';

export type IssueIconType = 'bug' | 'warning' | 'error' | 'stop';

export interface IconBearingProps {
  iconColor?: string;
}

export interface PageNodeProps extends BoxStyleProps {
  type: PageNodeType;
  skeletonColorDark?: string;
  skeletonColorLight?: string;
  iconColor?: string;
}

export interface IssueNodeProps extends BoxStyleProps {
  icon: IssueIconType;
  iconColor?: string;
}
