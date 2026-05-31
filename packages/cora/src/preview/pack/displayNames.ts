export const COMPONENT_DISPLAY_NAMES: Record<string, string> = {
  api: 'API',
  analytics: 'Analytics',
  configuration: 'Configuration',
  cloud: 'Cloud',
  archive: 'Archive',
  artificialIntelligence: 'Artificial Intelligence',
  multimedia: 'Multimedia',
  person: 'Person',
  people: 'People',
  app: 'App',
  box: 'Box',
  database: 'Database',
  decision: 'Decision',
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
    AnalyticsNode: 'Analytics',
    ConfigurationNode: 'Configuration',
    PersonNode: 'Person',
    PeopleNode: 'People',
    BoxNode: 'Box',
    DatabaseNode: 'Database',
    DecisionNode: 'Decision',
    Group: 'Group',
    IconNode: 'Icon',
    LabelIconNode: 'Icon Label',
    LabelNode: 'Label',
    DocumentNode: 'Document',
    WebsiteNode: 'Website',
  };
  return legacyLabels[label] ?? (label.endsWith('Node') ? label.slice(0, -4) : label);
}
