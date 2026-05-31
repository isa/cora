import type { ControlDefinition } from './schema.js';
import { API_SIZE_PRESETS, APP_SIZE_PRESETS, ANALYTICS_SIZE_PRESETS, ARCHIVE_SIZE_PRESETS, ARTIFICIAL_INTELLIGENCE_SIZE_PRESETS, CLOUD_SIZE_PRESETS, CONFIGURATION_SIZE_PRESETS, DATABASE_SIZE_PRESETS, DECISION_SIZE_PRESETS, DOCUMENT_SIZE_PRESETS, MULTIMEDIA_SIZE_PRESETS, PEOPLE_SIZE_PRESETS, PERSON_SIZE_PRESETS, WEBSITE_SIZE_PRESETS } from '../../renderer/components/styles.js';
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

export const decisionNodeDefaults: PreviewNodeProps = {
  ...catalogDefaultProps('decision'),
  title: 'Decision',
  size: 'lg',
};

export const analyticsNodeDefaults: PreviewNodeProps = {
  ...catalogDefaultProps('analytics'),
  title: 'Analytics',
  size: 'lg',
};

export const personNodeDefaults: PreviewNodeProps = {
  ...catalogDefaultProps('person'),
  title: 'Person',
  size: 'lg',
};

export const peopleNodeDefaults: PreviewNodeProps = {
  ...catalogDefaultProps('people'),
  title: 'People',
  size: 'lg',
};

export const configurationNodeDefaults: PreviewNodeProps = {
  ...catalogDefaultProps('configuration'),
  title: 'Configuration',
  size: 'lg',
};

export const cloudNodeDefaults: PreviewNodeProps = {
  ...catalogDefaultProps('cloud'),
  title: 'Cloud',
  size: 'lg',
};

export const archiveNodeDefaults: PreviewNodeProps = {
  ...catalogDefaultProps('archive'),
  title: 'Archive',
  size: 'lg',
};

export const artificialIntelligenceNodeDefaults: PreviewNodeProps = {
  ...catalogDefaultProps('artificialIntelligence'),
  title: 'AI',
  size: 'lg',
};

export const multimediaNodeDefaults: PreviewNodeProps = {
  ...catalogDefaultProps('multimedia'),
  title: 'Multimedia',
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
];


const noBorderOrShadow = (control: ControlDefinition<PreviewNodeProps>) =>
  control.key !== 'borderStyle' &&
  control.key !== 'borderColor' &&
  control.key !== 'borderWidth' &&
  control.key !== 'shadow' &&
  control.key !== 'shadowColor';

export const documentNodeControls: Array<ControlDefinition<PreviewNodeProps>> = [
  ...baseNodeControls
    .filter((control) => control.key !== 'radius' && noBorderOrShadow(control))
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
    .filter((control) => control.key !== 'radius' && noBorderOrShadow(control))
    .map((control): ControlDefinition<PreviewNodeProps> =>
      control.kind === 'size'
        ? {
            ...control,
            explicit: APP_SIZE_PRESETS.lg,
            presetSizes: APP_SIZE_PRESETS,
          }
        : control,
    ),
  { kind: 'color', key: 'iconColor', label: 'Icon color' },
];

export const apiNodeControls: Array<ControlDefinition<PreviewNodeProps>> = [
  ...baseNodeControls
    .filter((control) => control.key !== 'radius' && noBorderOrShadow(control))
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
    .filter((control) => control.key !== 'radius' && noBorderOrShadow(control))
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

export const decisionNodeControls: Array<ControlDefinition<PreviewNodeProps>> = [
  ...baseNodeControls
    .filter((control) => control.key !== 'radius' && noBorderOrShadow(control))
    .map((control): ControlDefinition<PreviewNodeProps> =>
      control.kind === 'size'
        ? {
            ...control,
            explicit: DECISION_SIZE_PRESETS.lg,
            presetSizes: DECISION_SIZE_PRESETS,
          }
        : control,
    ),
  { kind: 'color', key: 'iconColor', label: 'Icon color' },
];

export const analyticsNodeControls: Array<ControlDefinition<PreviewNodeProps>> = [
  ...baseNodeControls
    .filter((control) => control.key !== 'radius' && noBorderOrShadow(control))
    .map((control): ControlDefinition<PreviewNodeProps> =>
      control.kind === 'size'
        ? {
            ...control,
            explicit: ANALYTICS_SIZE_PRESETS.lg,
            presetSizes: ANALYTICS_SIZE_PRESETS,
          }
        : control,
    ),
  { kind: 'color', key: 'iconColor', label: 'Icon color' },
];

export const personNodeControls: Array<ControlDefinition<PreviewNodeProps>> = [
  ...baseNodeControls
    .filter((control) => control.key !== 'radius' && noBorderOrShadow(control))
    .map((control): ControlDefinition<PreviewNodeProps> =>
      control.kind === 'size'
        ? {
            ...control,
            explicit: PERSON_SIZE_PRESETS.lg,
            presetSizes: PERSON_SIZE_PRESETS,
          }
        : control,
    ),
  { kind: 'color', key: 'iconColor', label: 'Icon color' },
];

export const peopleNodeControls: Array<ControlDefinition<PreviewNodeProps>> = [
  ...baseNodeControls
    .filter((control) => control.key !== 'radius' && noBorderOrShadow(control))
    .map((control): ControlDefinition<PreviewNodeProps> =>
      control.kind === 'size'
        ? {
            ...control,
            explicit: PEOPLE_SIZE_PRESETS.lg,
            presetSizes: PEOPLE_SIZE_PRESETS,
          }
        : control,
    ),
  { kind: 'color', key: 'iconColor', label: 'Icon color' },
];

export const configurationNodeControls: Array<ControlDefinition<PreviewNodeProps>> = [
  ...baseNodeControls
    .filter((control) => control.key !== 'radius' && noBorderOrShadow(control))
    .map((control): ControlDefinition<PreviewNodeProps> =>
      control.kind === 'size'
        ? {
            ...control,
            explicit: CONFIGURATION_SIZE_PRESETS.lg,
            presetSizes: CONFIGURATION_SIZE_PRESETS,
          }
        : control,
    ),
  { kind: 'color', key: 'iconColor', label: 'Icon color' },
];

export const cloudNodeControls: Array<ControlDefinition<PreviewNodeProps>> = [
  ...baseNodeControls
    .filter((control) => control.key !== 'radius' && noBorderOrShadow(control))
    .map((control): ControlDefinition<PreviewNodeProps> =>
      control.kind === 'size'
        ? {
            ...control,
            explicit: CLOUD_SIZE_PRESETS.lg,
            presetSizes: CLOUD_SIZE_PRESETS,
          }
        : control,
    ),
  { kind: 'color', key: 'iconColor', label: 'Icon color' },
];

export const archiveNodeControls: Array<ControlDefinition<PreviewNodeProps>> = [
  ...baseNodeControls
    .filter((control) => control.key !== 'radius' && noBorderOrShadow(control))
    .map((control): ControlDefinition<PreviewNodeProps> =>
      control.kind === 'size'
        ? {
            ...control,
            explicit: ARCHIVE_SIZE_PRESETS.lg,
            presetSizes: ARCHIVE_SIZE_PRESETS,
          }
        : control,
    ),
  { kind: 'color', key: 'iconColor', label: 'Icon color' },
];

export const artificialIntelligenceNodeControls: Array<ControlDefinition<PreviewNodeProps>> = [
  ...baseNodeControls
    .filter((control) => control.key !== 'radius' && noBorderOrShadow(control))
    .map((control): ControlDefinition<PreviewNodeProps> =>
      control.kind === 'size'
        ? {
            ...control,
            explicit: ARTIFICIAL_INTELLIGENCE_SIZE_PRESETS.lg,
            presetSizes: ARTIFICIAL_INTELLIGENCE_SIZE_PRESETS,
          }
        : control,
    ),
  { kind: 'color', key: 'iconColor', label: 'Icon color' },
];

export const multimediaNodeControls: Array<ControlDefinition<PreviewNodeProps>> = [
  ...baseNodeControls
    .filter((control) => control.key !== 'radius' && noBorderOrShadow(control))
    .map((control): ControlDefinition<PreviewNodeProps> =>
      control.kind === 'size'
        ? {
            ...control,
            explicit: MULTIMEDIA_SIZE_PRESETS.lg,
            presetSizes: MULTIMEDIA_SIZE_PRESETS,
          }
        : control,
    ),
  { kind: 'color', key: 'iconColor', label: 'Icon color' },
];

export const websiteNodeControls: Array<ControlDefinition<PreviewNodeProps>> = [
  ...baseNodeControls
    .filter((control) => control.key !== 'radius' && noBorderOrShadow(control))
    .map((control): ControlDefinition<PreviewNodeProps> =>
      control.kind === 'size'
        ? {
            ...control,
            explicit: WEBSITE_SIZE_PRESETS.lg,
            presetSizes: WEBSITE_SIZE_PRESETS,
          }
        : control,
    ),
  { kind: 'color', key: 'backgroundColor', label: 'Body background' },
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
