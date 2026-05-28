export const COMPONENT_DISPLAY_NAMES: Record<string, string> = {
  api: 'API',
  app: 'App',
  box: 'Box',
  database: 'Database',
  document: 'Document',
  group: 'Group',
  icon: 'Icon',
  label: 'Label',
  labelIcon: 'Icon Label',
  website: 'Website',
};

export function displayNameForComponent(componentId: string): string {
  const direct = COMPONENT_DISPLAY_NAMES[componentId];
  if (direct) {
    return direct;
  }
  return componentId
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (letter) => letter.toUpperCase());
}

export function displayNameForComponentLabel(label: string): string {
  const legacyLabels: Record<string, string> = {
    AppNode: 'App',
    ApiNode: 'API',
    BoxNode: 'Box',
    DatabaseNode: 'Database',
    Group: 'Group',
    IconNode: 'Icon',
    LabelIconNode: 'Icon Label',
    LabelNode: 'Label',
    DocumentNode: 'Document',
    WebsiteNode: 'Website',
  };
  return legacyLabels[label] ?? (label.endsWith('Node') ? label.slice(0, -4) : label);
}
