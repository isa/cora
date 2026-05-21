import diagramSchema from './schema/diagram.schema.json' with { type: 'json' };

export const SCHEMA_ID = 'https://cora.dev/schema/v1/diagram.json';

const SUPPORTED_KINDS = [
  'box-arrows',
  'flowchart',
  'microservice',
  'infra',
  'database',
] as const;

export function getDiagramSchema(): object {
  return diagramSchema;
}

export function getSupportedKinds(): readonly string[] {
  return SUPPORTED_KINDS;
}
