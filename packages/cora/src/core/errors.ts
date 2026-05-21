import type { Diagram, DiagramFile, StructuredError } from './types.js';

export const ERROR_CODES = {
  SCHEMA_VIOLATION: 'SCHEMA_VIOLATION',
  MISSING_EDGE_TARGET: 'MISSING_EDGE_TARGET',
  UNKNOWN_SERVICE: 'UNKNOWN_SERVICE',
  MISSING_EXTENSION: 'MISSING_EXTENSION',
  PARSE_ERROR: 'PARSE_ERROR',
} as const;

function isExtensionInstalled(_provider: string): boolean {
  return false;
}

function isKnownService(_provider: string, _service: string): boolean {
  return false;
}

function isDiagramFile(document: unknown): document is DiagramFile {
  if (typeof document !== 'object' || document === null) {
    return false;
  }
  const record = document as Record<string, unknown>;
  return record.version === 1 && typeof record.diagram === 'object';
}

export function runSemanticValidation(diagram: Diagram): StructuredError[] {
  const errors: StructuredError[] = [];
  const nodeIds = new Set(diagram.nodes.map((node) => node.id));

  diagram.edges.forEach((edge, index) => {
    if (!nodeIds.has(edge.from)) {
      errors.push({
        code: 'MISSING_EDGE_TARGET',
        path: `/diagram/edges/${index}/from`,
        message: `Edge source "${edge.from}" does not match any node id`,
        suggestion: `Use one of: ${[...nodeIds].join(', ')}`,
      });
    }
    if (!nodeIds.has(edge.to)) {
      errors.push({
        code: 'MISSING_EDGE_TARGET',
        path: `/diagram/edges/${index}/to`,
        message: `Edge target "${edge.to}" does not match any node id`,
        suggestion: `Use one of: ${[...nodeIds].join(', ')}`,
      });
    }
  });

  diagram.nodes.forEach((node, index) => {
    if (node.service && !node.provider) {
      errors.push({
        code: 'UNKNOWN_SERVICE',
        path: `/diagram/nodes/${index}/service`,
        message: `Node "${node.id}" sets service without provider`,
        suggestion: 'Add a provider field or remove the service field',
      });
    }

    if (node.provider) {
      if (!isExtensionInstalled(node.provider)) {
        errors.push({
          code: 'MISSING_EXTENSION',
          path: `/diagram/nodes/${index}/provider`,
          message: `Extension for provider "${node.provider}" is not installed`,
          suggestion: `cora ext install ${node.provider}-theme`,
        });
      } else if (
        node.service &&
        !isKnownService(node.provider, node.service)
      ) {
        errors.push({
          code: 'UNKNOWN_SERVICE',
          path: `/diagram/nodes/${index}/service`,
          message: `Service "${node.service}" is not known for provider "${node.provider}"`,
          suggestion: 'Verify the extension manifest for valid service names',
        });
      }
    }
  });

  return errors;
}

export function runSemanticValidationOnDocument(
  document: unknown,
): StructuredError[] {
  if (!isDiagramFile(document)) {
    return [];
  }
  return runSemanticValidation(document.diagram);
}
