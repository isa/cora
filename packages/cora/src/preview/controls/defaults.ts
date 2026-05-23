import type { ControlDefinition } from './schema.js';

export const sizePresets = ['sm', 'md', 'lg', 'xl', 'xxl'] as const;

export type PreviewNodeProps = {
  title?: string;
  subtitle?: string;
  text?: string;
  backgroundColor?: string;
  radius?: number;
  borderStyle?: 'none' | 'solid' | 'dashed' | 'dotted';
  borderColor?: string;
  borderWidth?: number;
  textColor?: string;
  subtitleColor?: string;
  titleFontSize?: number;
  subtitleFontSize?: number;
  shadow?: 'none' | 'cast' | 'radial';
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | { width: number; height: number };
  iconColor?: string;
  strokeColor?: string;
  type?: 'landing' | 'form' | 'content' | 'profile' | 'settings';
  skeletonColorDark?: string;
  skeletonColorLight?: string;
  icon?: 'bug' | 'warning' | 'error' | 'stop';
  iconType?: 'ok' | 'nok' | 'question-mark';
};

export type ConnectionProps = {
  lineStyle: 'solid' | 'dashed' | 'dotted';
  strokeColor: string;
  strokeWidth: number;
  arrowSize: number;
  startMarker: 'none' | 'arrow' | 'circle' | 'filledCircle';
  endMarker: 'none' | 'arrow' | 'circle' | 'filledCircle';
  connectionMode: 'auto-side' | 'horizontal' | 'vertical';
};

export const baseNodeDefaults: PreviewNodeProps = {
  title: 'Component',
  subtitle: '',
  backgroundColor: '#E0F2FE',
  radius: 8,
  borderStyle: 'solid',
  borderColor: '#2F7D7E',
  borderWidth: 0.5,
  textColor: '#111827',
  subtitleColor: '#64748B',
  titleFontSize: 13,
  subtitleFontSize: 11,
  shadow: 'none',
  size: { width: 156, height: 40 },
  iconColor: '#2F7D7E',
};

export const pageNodeDefaults: PreviewNodeProps = {
  ...baseNodeDefaults,
  title: 'PageNode.type',
  type: 'landing',
  size: { width: 120, height: 164 },
  skeletonColorDark: '#64748B',
  skeletonColorLight: '#E2E8F0',
};

export const issueNodeDefaults: PreviewNodeProps = {
  ...baseNodeDefaults,
  title: 'IssueNode.icon',
  icon: 'warning',
  backgroundColor: '#FFE4E6',
  borderColor: '#F43F5E',
};

export const connectionDefaults: ConnectionProps = {
  lineStyle: 'solid',
  strokeColor: '#334155',
  strokeWidth: 2,
  arrowSize: 8,
  startMarker: 'none',
  endMarker: 'arrow',
  connectionMode: 'auto-side',
};

export const baseNodeControls: Array<ControlDefinition<PreviewNodeProps>> = [
  { kind: 'text', key: 'title', label: 'Title' },
  { kind: 'text', key: 'subtitle', label: 'Subtitle' },
  { kind: 'color', key: 'backgroundColor', label: 'Fill' },
  { kind: 'number', key: 'radius', label: 'Radius', min: 0, max: 24, step: 1 },
  {
    kind: 'enum',
    key: 'borderStyle',
    label: 'Border style',
    options: ['none', 'solid', 'dashed', 'dotted'],
  },
  { kind: 'color', key: 'borderColor', label: 'Border' },
  { kind: 'number', key: 'borderWidth', label: 'Border width', min: 0, max: 8, step: 0.5 },
  { kind: 'color', key: 'textColor', label: 'Title color' },
  { kind: 'color', key: 'subtitleColor', label: 'Subtitle color' },
  { kind: 'number', key: 'titleFontSize', label: 'Title size', min: 8, max: 28, step: 1 },
  { kind: 'number', key: 'subtitleFontSize', label: 'Subtitle size', min: 7, max: 24, step: 1 },
  { kind: 'enum', key: 'shadow', label: 'Shadow', options: ['none', 'cast', 'radial'] },
  {
    kind: 'size',
    key: 'size',
    label: 'Size',
    presets: [...sizePresets],
    explicit: { width: 156, height: 40 },
  },
];

export const labelNodeControls: Array<ControlDefinition<PreviewNodeProps>> =
  baseNodeControls.filter((control) => control.key !== 'size' && control.key !== 'shadow');

export const iconNodeControls: Array<ControlDefinition<PreviewNodeProps>> = [
  { kind: 'enum', key: 'iconType', label: 'Type', options: ['ok', 'nok', 'question-mark'] },
  { kind: 'color', key: 'iconColor', label: 'Fill' },
  {
    kind: 'size',
    key: 'size',
    label: 'Size',
    presets: [...sizePresets],
    explicit: { width: 40, height: 40 },
  },
];

export const labelIconNodeControls: Array<ControlDefinition<PreviewNodeProps>> = [
  { kind: 'enum', key: 'iconType', label: 'Type', options: ['ok', 'nok', 'question-mark'] },
  { kind: 'color', key: 'iconColor', label: 'Fill' },
  { kind: 'color', key: 'backgroundColor', label: 'Background' },
  {
    kind: 'size',
    key: 'size',
    label: 'Size',
    presets: [...sizePresets],
    explicit: { width: 40, height: 40 },
  },
];

export const pageNodeControls: Array<ControlDefinition<PreviewNodeProps>> = [
  ...baseNodeControls,
  { kind: 'enum', key: 'type', label: 'PageNode.type', options: ['landing', 'form', 'content', 'profile', 'settings'] },
  { kind: 'color', key: 'skeletonColorDark', label: 'Skeleton dark' },
  { kind: 'color', key: 'skeletonColorLight', label: 'Skeleton light' },
];

export const issueNodeControls: Array<ControlDefinition<PreviewNodeProps>> = [
  ...baseNodeControls,
  { kind: 'color', key: 'iconColor', label: 'Icon color' },
  { kind: 'enum', key: 'icon', label: 'IssueNode.icon', options: ['bug', 'warning', 'error', 'stop'] },
];

export const connectionControls: Array<ControlDefinition<ConnectionProps>> = [
  { kind: 'enum', key: 'lineStyle', label: 'Line style', options: ['solid', 'dashed', 'dotted'] },
  { kind: 'color', key: 'strokeColor', label: 'Stroke color' },
  { kind: 'number', key: 'strokeWidth', label: 'Stroke width', min: 1, max: 8, step: 1 },
  { kind: 'number', key: 'arrowSize', label: 'Arrow-head size', min: 4, max: 24, step: 1 },
  { kind: 'enum', key: 'startMarker', label: 'Start marker', options: ['none', 'arrow', 'circle', 'filledCircle'] },
  { kind: 'enum', key: 'endMarker', label: 'End marker', options: ['none', 'arrow', 'circle', 'filledCircle'] },
  { kind: 'enum', key: 'connectionMode', label: 'Connection mode', options: ['auto-side', 'horizontal', 'vertical'] },
];
