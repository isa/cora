import { displayNameForComponent } from './displayNames.js';
import type { PackManifest } from './types.js';
import type { WorkbenchState } from '../state.js';

export interface CatalogItem {
  id: string;
  label: string;
  family: string;
  provider?: string;
  service?: string;
}

export function catalogItems(state: WorkbenchState): CatalogItem[] {
  const iconShortcuts = uniqueIconShortcuts(state);
  return [
    ...state.pack.components.map((component) => ({
      id: component.id,
      label: displayNameForComponent(component.id),
      family: state.pack.families.find((item) => item.id === component.family)?.label ?? component.family,
    })),
    ...iconShortcuts,
    { id: 'group', label: displayNameForComponent('group'), family: 'Layout' },
  ];
}

export function catalogItemsFromPack(pack: PackManifest): CatalogItem[] {
  return [
    ...pack.components.map((component) => ({
      id: component.id,
      label: displayNameForComponent(component.id),
      family: pack.families.find((item) => item.id === component.family)?.label ?? component.family,
    })),
    { id: 'group', label: displayNameForComponent('group'), family: 'Layout' },
  ];
}

function uniqueIconShortcuts(state: WorkbenchState): CatalogItem[] {
  const seen = new Set<string>();
  const shortcuts: CatalogItem[] = [];

  for (const node of state.nodes) {
    if (node.componentId !== 'icon' || !node.props.provider || !node.props.service) {
      continue;
    }
    const provider = node.props.provider;
    const service = node.props.service;
    const key = `${provider}:${service}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    shortcuts.push({
      id: `icon:${provider}:${service}`,
      label: node.props.title?.trim() && node.props.title !== 'Icon'
        ? node.props.title
        : service,
      family: 'Icons',
      provider,
      service,
    });
  }

  return shortcuts;
}
