import type { MarkerType } from '../renderer/components/lines/markers.js';
import type { LineStyle } from '../renderer/components/lines/styles.js';

import type { PreviewScenarioId } from './pack/types.js';

export interface LineVariant {
  id: 'plain' | 'arrow' | 'dashed-arrow' | 'dotted-circle' | 'double-marker';
  label: string;
  lineStyle: LineStyle;
  startMarker: MarkerType;
  endMarker: MarkerType;
}

export const lineVariants: LineVariant[] = [
  { id: 'plain', label: 'Plain', lineStyle: 'solid', startMarker: 'none', endMarker: 'none' },
  { id: 'arrow', label: 'Arrow', lineStyle: 'solid', startMarker: 'none', endMarker: 'arrow' },
  { id: 'dashed-arrow', label: 'Dashed arrow', lineStyle: 'dashed', startMarker: 'none', endMarker: 'arrow' },
  { id: 'dotted-circle', label: 'Dotted circle', lineStyle: 'dotted', startMarker: 'circle', endMarker: 'circle' },
  { id: 'double-marker', label: 'Double marker', lineStyle: 'solid', startMarker: 'filledCircle', endMarker: 'arrow' },
];

export const scenarioIds: PreviewScenarioId[] = [
  'isolated',
  'connected',
  'grouped',
  'grouped-connected',
];

export function isConnectedScenario(id: PreviewScenarioId): boolean {
  return id === 'connected' || id === 'grouped-connected';
}

export function isGroupedScenario(id: PreviewScenarioId): boolean {
  return id === 'grouped' || id === 'grouped-connected';
}
