/** Human-readable preview labels (sidebar, layers, inspector). */
export const COMPONENT_DISPLAY_NAMES: Record<string, string> = {
  box: 'Box',
  label: 'Label',
  icon: 'Icon',
  labelIcon: 'Icon Label',
  website: 'Website',
  page: 'Page',
  app: 'App',
  group: 'Group',
};

export function displayNameForComponent(componentId: string): string {
  return COMPONENT_DISPLAY_NAMES[componentId] ?? componentId;
}

function isPlaceholderTitle(title: string, componentId: string): boolean {
  const normalized = title.trim().toLowerCase();
  if (!normalized) return true;
  if (normalized.endsWith('node')) return true;
  if (normalized === componentId.toLowerCase()) return true;
  if (normalized === displayNameForComponent(componentId).toLowerCase()) return true;
  return false;
}

export function layerNodeTitle(
  componentId: string,
  props: { title?: string; text?: string },
): string {
  const fallback = displayNameForComponent(componentId);
  const custom = props.title?.trim() || props.text?.trim();
  if (custom && !isPlaceholderTitle(custom, componentId)) {
    return custom;
  }
  return fallback;
}
