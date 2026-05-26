import type { ControlDefinition } from './schema.js';
import { catalogDefaultProps } from '../../renderer/themes/componentDefaults.js';
import type { MarkerType } from '../../renderer/components/lines/markers.js';
import { LOOK } from '../../renderer/themes/lookTokens.js';

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
  skeletonColor?: string;
  titleFontSize?: number;
  subtitleFontSize?: number;
  shadow?: 'none' | 'cast' | 'radial';
  shadowColor?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | { width: number; height: number };
  iconColor?: string;
  strokeColor?: string;
  type?: 'landing' | 'form' | 'content' | 'profile' | 'settings';
  skeletonColorDark?: string;
  skeletonColorLight?: string;
  provider?: string;
  service?: string;
  iconType?: 'ok' | 'nok' | 'question-mark';
};

export type ConnectionProps = {
  lineStyle: 'solid' | 'dashed' | 'dotted';
  strokeColor: string;
  strokeWidth: number;
  arrowSize: number;
  startMarker: MarkerType;
  endMarker: MarkerType;
  connectionMode: 'auto-side' | 'horizontal' | 'vertical';
};

export const markerOptions: MarkerType[] = [
  'none',
  'arrow',
  'circle',
  'filledCircle',
  'diamond',
  'filledDiamond',
  'square',
  'filledSquare',
];

export const baseNodeDefaults: PreviewNodeProps = {
  title: 'Component',
  subtitle: '',
  ...catalogDefaultProps('box'),
};

export const pageNodeDefaults: PreviewNodeProps = {
  ...catalogDefaultProps('page'),
  title: 'PageNode.type',
  type: 'landing',
};

export const connectionDefaults: ConnectionProps = {
  lineStyle: 'solid',
  strokeColor: LOOK.edge.stroke,
  strokeWidth: LOOK.edge.width,
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
  { kind: 'color', key: 'shadowColor', label: 'Shadow color' },
  {
    kind: 'size',
    key: 'size',
    label: 'Size',
    presets: [...sizePresets],
    explicit: { width: 140, height: 40 },
  },
];

export const labelNodeControls: Array<ControlDefinition<PreviewNodeProps>> =
  baseNodeControls.filter((control) => control.key !== 'size' && control.key !== 'shadow' && control.key !== 'shadowColor');

export const iconNodeControls: Array<ControlDefinition<PreviewNodeProps>> = [
  { kind: 'text', key: 'title', label: 'Title' },
  { kind: 'text', key: 'subtitle', label: 'Subtitle' },
  { kind: 'text', key: 'provider', label: 'Provider' },
  { kind: 'text', key: 'service', label: 'Icon' },
  { kind: 'color', key: 'iconColor', label: 'Icon color' },
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
  {
    kind: 'size',
    key: 'size',
    label: 'Size',
    presets: [...sizePresets],
    explicit: { width: 72, height: 80 },
  },
];

export const labelIconNodeControls: Array<ControlDefinition<PreviewNodeProps>> = [
  { kind: 'text', key: 'title', label: 'Title' },
  { kind: 'text', key: 'subtitle', label: 'Subtitle' },
  { kind: 'text', key: 'provider', label: 'Provider' },
  { kind: 'text', key: 'service', label: 'Icon' },
  {
    kind: 'enum',
    key: 'iconType',
    label: 'Status badge',
    options: ['ok', 'nok', 'question-mark'],
  },
  { kind: 'color', key: 'iconColor', label: 'Icon color' },
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
  { kind: 'color', key: 'shadowColor', label: 'Shadow color' },
  {
    kind: 'size',
    key: 'size',
    label: 'Size',
    presets: [...sizePresets],
    explicit: { width: 128, height: 56 },
  },
];

export const pageNodeControls: Array<ControlDefinition<PreviewNodeProps>> = [
  ...baseNodeControls,
  { kind: 'enum', key: 'type', label: 'PageNode.type', options: ['landing', 'form', 'content', 'profile', 'settings'] },
  { kind: 'color', key: 'skeletonColorDark', label: 'Skeleton dark' },
  { kind: 'color', key: 'skeletonColorLight', label: 'Skeleton light' },
];

export const websiteNodeControls: Array<ControlDefinition<PreviewNodeProps>> = [
  ...baseNodeControls,
  { kind: 'color', key: 'skeletonColor', label: 'Skeleton' },
];

export const connectionControls: Array<ControlDefinition<ConnectionProps>> = [
  { kind: 'enum', key: 'lineStyle', label: 'Line style', options: ['solid', 'dashed', 'dotted'] },
  { kind: 'color', key: 'strokeColor', label: 'Stroke color' },
  { kind: 'number', key: 'strokeWidth', label: 'Stroke width', min: 1, max: 8, step: 1 },
  { kind: 'number', key: 'arrowSize', label: 'Arrow-head size', min: 4, max: 24, step: 1 },
  { kind: 'enum', key: 'startMarker', label: 'Start marker', options: markerOptions, display: 'select' },
  { kind: 'enum', key: 'endMarker', label: 'End marker', options: markerOptions, display: 'select' },
  { kind: 'enum', key: 'connectionMode', label: 'Connection mode', options: ['auto-side', 'horizontal', 'vertical'] },
];
