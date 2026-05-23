import type { ComponentType, ReactNode } from 'react';

import type { ControlDefinition } from '../controls/schema.js';

export type PreviewNodeRole = 'primary' | 'secondary';

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
}

export interface PackManifest {
  id: string;
  label: string;
  families: PreviewComponentFamily[];
  components: Array<PreviewComponentDefinition>;
}
