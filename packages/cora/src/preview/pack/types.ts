import type { ComponentType, ReactNode } from 'react';

import type { ControlDefinition } from '../controls/schema.js';
import type { LineVariant } from '../scenarios.js';

export type PreviewNodeRole = 'primary' | 'secondary';
export type PreviewScenarioId = 'isolated' | 'connected' | 'grouped' | 'grouped-connected';

export interface PreviewComponentFamily {
  id: string;
  label: string;
}

export interface PreviewComponentDefinition<Props extends Record<string, unknown> = Record<string, unknown>> {
  id: string;
  label: string;
  family: string;
  component: ComponentType<Props>;
  defaultProps: Props;
  controls: Array<ControlDefinition<Props>>;
  showcase?: ReactNode;
  scenarios: PreviewScenarioId[];
}

export interface PreviewScenarioDefinition {
  id: PreviewScenarioId;
  label: string;
  lineVariants?: LineVariant[];
  group?: {
    label: string;
  };
}

export interface PackManifest {
  id: string;
  label: string;
  families: PreviewComponentFamily[];
  components: Array<PreviewComponentDefinition>;
  scenarios: PreviewScenarioDefinition[];
}
