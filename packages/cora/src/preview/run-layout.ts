import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { computeLayout } from '../core/layout.js';
import { measureNodes } from '../core/measureText.js';
import { resolveTheme } from '../core/themeResolver.js';
import { defaultTheme } from '../renderer/themes/default.js';
import { deserializeWorkbenchState, serializeWorkbenchDocument } from './persistence.js';
import { previewNodeSize } from './geometry.js';

// 1. Initial run
const content = readFileSync('tests/legacy/fixtures/valid/database.yaml', 'utf-8');
const parsed = parse(content);
const diagram = parsed.diagram;

const { nodeStyles, theme } = resolveTheme(diagram, defaultTheme);
const measuredNodes = measureNodes(diagram.nodes);
const layouted1 = await computeLayout({ diagram, measuredNodes, theme });

// 2. Simulate preview deserialize -> serialize -> layout
const deserialized = await deserializeWorkbenchState('database.yaml', content);
if ('errors' in deserialized) {
  console.error(deserialized.errors);
  process.exit(1);
}

const state = deserialized.state;
const serializedDoc = serializeWorkbenchDocument(state);
const previewSizeById = new Map(state.nodes.map((node) => [node.id, previewNodeSize(node)] as const));
const resolvedTheme2 = resolveTheme(serializedDoc.diagram, defaultTheme);
const measuredNodes2 = applyNodeStyles(measureNodes(serializedDoc.diagram.nodes), resolvedTheme2.nodeStyles).map((node) => {
  const size = previewSizeById.get(node.id);
  return size ? { ...node, measuredWidth: size.width, measuredHeight: size.height } : node;
});

const layouted2 = await computeLayout({
  diagram: serializedDoc.diagram,
  measuredNodes: measuredNodes2,
  theme: resolvedTheme2.theme,
});

console.log('--- COMPARE NODES ---');
for (const n1 of layouted1.nodes) {
  const n2 = layouted2.nodes.find(n => n.id === n1.id)!;
  console.log(`${n1.id}:`);
  console.log(`  Initial:    x=${n1.x}, y=${n1.y}, w=${n1.measuredWidth}, h=${n1.measuredHeight}`);
  console.log(`  Serialized: x=${n2.x}, y=${n2.y}, w=${n2.measuredWidth}, h=${n2.measuredHeight}`);
}

console.log('--- COMPARE EDGES ---');
for (let i = 0; i < layouted1.edges.length; i++) {
  const e1 = layouted1.edges[i]!;
  const e2 = layouted2.edges[i]!;
  console.log(`${e1.from} -> ${e1.to} (${e1.label}):`);
  console.log(`  Initial:    ${JSON.stringify(e1.points)}`);
  console.log(`  Serialized: ${JSON.stringify(e2.points)}`);
}

function applyNodeStyles(
  measuredNodes: any[],
  nodeStyles: Map<string, any>,
): any[] {
  return measuredNodes.map((node) => ({
    ...node,
    resolvedStyle: nodeStyles.get(node.id),
  }));
}
