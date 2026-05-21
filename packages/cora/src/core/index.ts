export { parseFile, ParseError } from './parser.js';
export { getDiagramSchema, getSupportedKinds, SCHEMA_ID } from './schema.js';
export {
  ERROR_CODES,
  runSemanticValidation,
  runSemanticValidationOnDocument,
} from './errors.js';
export { validateDocument, validateDiagram } from './validator.js';
export type {
  Diagram,
  DiagramEdge,
  DiagramFile,
  DiagramGroup,
  DiagramKind,
  DiagramNode,
  ErrorCode,
  ParseResult,
  StructuredError,
} from './types.js';
