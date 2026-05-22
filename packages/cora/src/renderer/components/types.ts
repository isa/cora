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
