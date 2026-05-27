import type { Diagram, DiagramFile, StructuredError } from './types.js';
import {
  DEFAULT_ICON_PREFIX,
  hasIconReference,
  iconPrefixForProvider,
  iconReferenceForNode,
  iconSetForPrefix,
  parseIconReference,
} from './iconify.js';

export const ERROR_CODES = {
  SCHEMA_VIOLATION: 'SCHEMA_VIOLATION',
  MISSING_EDGE_TARGET: 'MISSING_EDGE_TARGET',
  UNKNOWN_SERVICE: 'UNKNOWN_SERVICE',
  MISSING_EXTENSION: 'MISSING_EXTENSION',
  PARSE_ERROR: 'PARSE_ERROR',
} as const;

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
    if (node.icon) {
      const reference = parseIconReference(node.icon);
      if (!reference) {
        errors.push({
          code: 'UNKNOWN_SERVICE',
          path: `/diagram/nodes/${index}/icon`,
          message: `Icon "${node.icon}" must use the "prefix:name" Iconify format`,
          suggestion: `Use an installed icon set, for example "${DEFAULT_ICON_PREFIX}:database"`,
        });
      } else if (!iconSetForPrefix(reference.prefix)) {
        errors.push({
          code: 'MISSING_EXTENSION',
          path: `/diagram/nodes/${index}/icon`,
          message: `Icon set "${reference.prefix}" is not installed`,
          suggestion: `Use "${DEFAULT_ICON_PREFIX}:..." or add the matching @iconify-json/${reference.prefix} package`,
        });
      } else if (!hasIconReference(node.icon)) {
        errors.push({
          code: 'UNKNOWN_SERVICE',
          path: `/diagram/nodes/${index}/icon`,
          message: `Icon "${node.icon}" is not available`,
          suggestion: `Verify the icon name in the "${reference.prefix}" Iconify set`,
        });
      }
    }

    if (node.service && !node.provider) {
      errors.push({
        code: 'UNKNOWN_SERVICE',
        path: `/diagram/nodes/${index}/service`,
        message: `Node "${node.id}" sets service without provider`,
        suggestion: 'Add a provider field or remove the service field',
      });
    }

    if (node.provider) {
      const iconPrefix = iconPrefixForProvider(node.provider);
      if (!iconPrefix || !iconSetForPrefix(iconPrefix)) {
        errors.push({
          code: 'MISSING_EXTENSION',
          path: `/diagram/nodes/${index}/provider`,
          message: `Icon set for provider "${node.provider}" is not installed`,
          suggestion: `Use provider "default" or "${DEFAULT_ICON_PREFIX}", or add the matching @iconify-json package`,
        });
      } else if (node.service && !hasIconReference(iconReferenceForNode(node)!)) {
        errors.push({
          code: 'UNKNOWN_SERVICE',
          path: `/diagram/nodes/${index}/service`,
          message: `Service "${node.service}" is not known for provider "${node.provider}"`,
          suggestion: `Verify the icon name in the "${iconPrefix}" Iconify set`,
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
