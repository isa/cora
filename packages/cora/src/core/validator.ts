import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

import { runSemanticValidationOnDocument } from './errors.js';
import { getDiagramSchema } from './schema.js';
import type { StructuredError } from './types.js';

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);

const validateSchema = ajv.compile(getDiagramSchema());

function mapSchemaErrors(): StructuredError[] {
  return (validateSchema.errors ?? []).map((error) => {
    const path = error.instancePath || '';
    let suggestion: string | undefined;

    if (path === '' && error.keyword === 'required') {
      suggestion = 'Add version: 1 at the document root';
    }

    return {
      code: 'SCHEMA_VIOLATION',
      path,
      message: error.message ?? 'Schema validation failed',
      suggestion,
    };
  });
}

export function validateDocument(document: unknown): StructuredError[] {
  const valid = validateSchema(document);
  if (!valid) {
    return mapSchemaErrors();
  }
  return runSemanticValidationOnDocument(document);
}

/** @deprecated Use validateDocument */
export const validateDiagram = validateDocument;
