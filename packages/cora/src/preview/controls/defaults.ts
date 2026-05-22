import type { ControlDefinition } from './schema.js';

export const sizePresets = ['sm', 'md', 'lg', 'xl', 'xxl'] as const;

export type PreviewNodeProps = {
  text?: string;
  backgroundColor?: string;
  radius?: number;
  borderStyle?: 'none' | 'solid' | 'dashed' | 'dotted';
  borderColor?: string;
  borderWidth?: number;
  textColor?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | { width: number; height: number };
  iconColor?: string;
  strokeColor?: string;
  type?: 'landing' | 'form' | 'content' | 'profile' | 'settings';
  skeletonColorDark?: string;
  skeletonColorLight?: string;
  icon?: 'bug' | 'warning' | 'error' | 'stop';
};

export type ConnectionProps = {
  lineStyle: 'solid' | 'dashed' | 'dotted';
  strokeColor: string;
  strokeWidth: number;
  startMarker: 'none' | 'arrow' | 'circle' | 'filledCircle';
  endMarker: 'none' | 'arrow' | 'circle' | 'filledCircle';
  connectionMode: 'auto-side' | 'horizontal' | 'vertical';
};

export const baseNodeDefaults: PreviewNodeProps = {
  text: 'Component',
  backgroundColor: '#E0F2FE',
  radius: 8,
  borderStyle: 'solid',
  borderColor: '#2F7D7E',
  borderWidth: 1,
  textColor: '#111827',
  size: 'lg',
  iconColor: '#2F7D7E',
};

export const pageNodeDefaults: PreviewNodeProps = {
  ...baseNodeDefaults,
  text: 'PageNode.type',
  type: 'landing',
  skeletonColorDark: '#64748B',
  skeletonColorLight: '#E2E8F0',
};

export const issueNodeDefaults: PreviewNodeProps = {
  ...baseNodeDefaults,
  text: 'IssueNode.icon',
  icon: 'warning',
  backgroundColor: '#FFE4E6',
  borderColor: '#F43F5E',
};

export const connectionDefaults: ConnectionProps = {
  lineStyle: 'solid',
  strokeColor: '#334155',
  strokeWidth: 2,
  startMarker: 'none',
  endMarker: 'arrow',
  connectionMode: 'auto-side',
};

export const baseNodeControls: Array<ControlDefinition<PreviewNodeProps>> = [
  { kind: 'text', key: 'text', label: 'Text' },
  { kind: 'color', key: 'backgroundColor', label: 'Fill' },
  { kind: 'number', key: 'radius', label: 'Radius', min: 0, max: 24, step: 1 },
  {
    kind: 'enum',
    key: 'borderStyle',
    label: 'Border style',
    options: ['none', 'solid', 'dashed', 'dotted'],
  },
  { kind: 'color', key: 'borderColor', label: 'Border' },
  { kind: 'number', key: 'borderWidth', label: 'Border width', min: 0, max: 8, step: 1 },
  { kind: 'color', key: 'textColor', label: 'Text color' },
  {
    kind: 'size',
    key: 'size',
    label: 'Size',
    presets: [...sizePresets],
    explicit: { width: 176, height: 72 },
  },
];

export const iconNodeControls: Array<ControlDefinition<PreviewNodeProps>> = [
  ...baseNodeControls,
  { kind: 'color', key: 'iconColor', label: 'Icon color' },
];

export const pageNodeControls: Array<ControlDefinition<PreviewNodeProps>> = [
  ...baseNodeControls,
  { kind: 'enum', key: 'type', label: 'PageNode.type', options: ['landing', 'form', 'content', 'profile', 'settings'] },
  { kind: 'color', key: 'skeletonColorDark', label: 'Skeleton dark' },
  { kind: 'color', key: 'skeletonColorLight', label: 'Skeleton light' },
];

export const issueNodeControls: Array<ControlDefinition<PreviewNodeProps>> = [
  ...iconNodeControls,
  { kind: 'enum', key: 'icon', label: 'IssueNode.icon', options: ['bug', 'warning', 'error', 'stop'] },
];

export const connectionControls: Array<ControlDefinition<ConnectionProps>> = [
  { kind: 'enum', key: 'lineStyle', label: 'Line style', options: ['solid', 'dashed', 'dotted'] },
  { kind: 'color', key: 'strokeColor', label: 'Stroke color' },
  { kind: 'number', key: 'strokeWidth', label: 'Stroke width', min: 1, max: 8, step: 1 },
  { kind: 'enum', key: 'startMarker', label: 'Start marker', options: ['none', 'arrow', 'circle', 'filledCircle'] },
  { kind: 'enum', key: 'endMarker', label: 'End marker', options: ['none', 'arrow', 'circle', 'filledCircle'] },
  { kind: 'enum', key: 'connectionMode', label: 'Connection mode', options: ['auto-side', 'horizontal', 'vertical'] },
];
