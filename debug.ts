import { readFile } from 'fs/promises';
import { parseDiagram, computeLayout, measureNodes, catalogDefaultProps, renderToText } from './packages/cora/src/index';

async function main() {
  const content = await readFile('examples/valid/box-arrows.yaml', 'utf-8');
  const parsed = parseDiagram(content);
  const theme = catalogDefaultProps();
  const measured = measureNodes(parsed, theme);
  const layouted = await computeLayout({ diagram: parsed, measuredNodes: measured, theme });
  const text = renderToText(layouted, { charset: 'unicode' });
  console.log("=== TEXT ===");
  console.log(text);
  console.log("=== EDGES ===");
  layouted.edges.forEach(e => console.log(e.from, "->", e.to, JSON.stringify(e.points)));
}
main();
