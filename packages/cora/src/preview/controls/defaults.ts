import type { ControlDefinition } from './schema.js';
import { API_SIZE_PRESETS, APP_SIZE_PRESETS, DATABASE_SIZE_PRESETS, DOCUMENT_SIZE_PRESETS, WEBSITE_SIZE_PRESETS } from '../../renderer/components/styles.js';
import { catalogDefaultProps } from '../../renderer/themes/componentDefaults.js';
import { DIAGRAM_FONT_OPTIONS } from '../../renderer/themes/diagramFonts.js';
import { LOOK } from '../../renderer/themes/lookTokens.js';
import type { MarkerType } from '../../renderer/components/lines/markers.js';

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
  fontFamily?: string;
  titleBold?: boolean;
  subtitleBold?: boolean;
  shadow?: 'none' | 'cast' | 'radial';
  shadowColor?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | { width: number; height: number };
  iconColor?: string;
  strokeColor?: string;
  iconName?: string;
  iconType?: 'ok' | 'nok' | 'question-mark';
};

export const fontFamilyControl: ControlDefinition<PreviewNodeProps> = {
  kind: 'enum',
  key: 'fontFamily',
  label: 'Font family',
  options: [...DIAGRAM_FONT_OPTIONS],
  display: 'select',
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

export const documentNodeDefaults: PreviewNodeProps = {
  ...catalogDefaultProps('document'),
  title: 'Document',
  size: 'lg',
};

export const appNodeDefaults: PreviewNodeProps = {
  ...catalogDefaultProps('app'),
  title: 'App',
  size: 'lg',
};

export const apiNodeDefaults: PreviewNodeProps = {
  ...catalogDefaultProps('api'),
  title: 'API',
  size: 'lg',
};

export const databaseNodeDefaults: PreviewNodeProps = {
  ...catalogDefaultProps('database'),
  title: 'Database',
  size: 'lg',
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
  fontFamilyControl,
  { kind: 'text', key: 'title', label: 'Title' },
  { kind: 'text', key: 'subtitle', label: 'Subtitle' },
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
  { kind: 'bold', key: 'titleBold', label: 'Bold' },
  { kind: 'bold', key: 'subtitleBold', label: 'Bold' },
  { kind: 'enum', key: 'shadow', label: 'Shadow', options: ['none', 'cast', 'radial'] },
  { kind: 'color', key: 'shadowColor', label: 'Shadow color' },
];

export const boxNodeControls: Array<ControlDefinition<PreviewNodeProps>> = [
  ...baseNodeControls,
  { kind: 'color', key: 'backgroundColor', label: 'Fill' },
];

export const labelNodeControls: Array<ControlDefinition<PreviewNodeProps>> =
  baseNodeControls.filter((control) => control.key !== 'size' && control.key !== 'shadow' && control.key !== 'shadowColor');

export const iconNodeControls: Array<ControlDefinition<PreviewNodeProps>> = [
  { kind: 'color', key: 'iconColor', label: 'Icon color' },
  fontFamilyControl,
  { kind: 'text', key: 'title', label: 'Title' },
  { kind: 'text', key: 'subtitle', label: 'Subtitle' },
  { kind: 'color', key: 'textColor', label: 'Title color' },
  { kind: 'color', key: 'subtitleColor', label: 'Subtitle color' },
  { kind: 'number', key: 'titleFontSize', label: 'Title size', min: 8, max: 28, step: 1 },
  { kind: 'number', key: 'subtitleFontSize', label: 'Subtitle size', min: 7, max: 24, step: 1 },
  { kind: 'bold', key: 'titleBold', label: 'Bold' },
  { kind: 'bold', key: 'subtitleBold', label: 'Bold' },
];

export const labelIconNodeControls: Array<ControlDefinition<PreviewNodeProps>> = [
  { kind: 'color', key: 'iconColor', label: 'Icon color' },
  fontFamilyControl,
  { kind: 'text', key: 'title', label: 'Title' },
  { kind: 'text', key: 'subtitle', label: 'Subtitle' },
  { kind: 'color', key: 'textColor', label: 'Title color' },
  { kind: 'color', key: 'subtitleColor', label: 'Subtitle color' },
  { kind: 'number', key: 'titleFontSize', label: 'Title size', min: 8, max: 28, step: 1 },
  { kind: 'number', key: 'subtitleFontSize', label: 'Subtitle size', min: 7, max: 24, step: 1 },
  { kind: 'bold', key: 'titleBold', label: 'Bold' },
  { kind: 'bold', key: 'subtitleBold', label: 'Bold' },
  { kind: 'color', key: 'backgroundColor', label: 'Background' },
];


export const documentNodeControls: Array<ControlDefinition<PreviewNodeProps>> = [
  ...baseNodeControls
    .filter((control) =>
      control.key !== 'radius' &&
      control.key !== 'borderStyle' &&
      control.key !== 'borderColor' &&
      control.key !== 'borderWidth'
    )
    .map((control): ControlDefinition<PreviewNodeProps> =>
      control.kind === 'size'
      ? {
          ...control,
          explicit: DOCUMENT_SIZE_PRESETS.lg,
          presetSizes: DOCUMENT_SIZE_PRESETS,
        }
      : control,
    ),
  { kind: 'color', key: 'iconColor', label: 'Icon color' },
];

export const appNodeControls: Array<ControlDefinition<PreviewNodeProps>> = [
  ...baseNodeControls
    .filter((control) => control.key !== 'radius')
    .map((control): ControlDefinition<PreviewNodeProps> =>
      control.kind === 'size'
        ? {
            ...control,
            explicit: APP_SIZE_PRESETS.lg,
            presetSizes: APP_SIZE_PRESETS,
          }
        : control,
    ),
];

export const apiNodeControls: Array<ControlDefinition<PreviewNodeProps>> = [
  ...baseNodeControls
    .filter((control) =>
      control.key !== 'radius' &&
      control.key !== 'borderStyle' &&
      control.key !== 'borderColor' &&
      control.key !== 'borderWidth'
    )
    .map((control): ControlDefinition<PreviewNodeProps> =>
      control.kind === 'size'
        ? {
            ...control,
            explicit: API_SIZE_PRESETS.lg,
            presetSizes: API_SIZE_PRESETS,
          }
        : control,
    ),
  { kind: 'color', key: 'iconColor', label: 'Icon color' },
];

export const databaseNodeControls: Array<ControlDefinition<PreviewNodeProps>> = [
  ...baseNodeControls
    .filter((control) =>
      control.key !== 'radius' &&
      control.key !== 'borderStyle' &&
      control.key !== 'borderColor' &&
      control.key !== 'borderWidth'
    )
    .map((control): ControlDefinition<PreviewNodeProps> =>
      control.kind === 'size'
        ? {
            ...control,
            explicit: DATABASE_SIZE_PRESETS.lg,
            presetSizes: DATABASE_SIZE_PRESETS,
          }
        : control,
    ),
  { kind: 'color', key: 'iconColor', label: 'Icon color' },
];

export const websiteNodeControls: Array<ControlDefinition<PreviewNodeProps>> = [
  ...baseNodeControls
    .filter((control) => control.key !== 'radius')
    .map((control): ControlDefinition<PreviewNodeProps> =>
      control.kind === 'size'
        ? {
            ...control,
            explicit: WEBSITE_SIZE_PRESETS.lg,
            presetSizes: WEBSITE_SIZE_PRESETS,
          }
        : control,
    ),
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
