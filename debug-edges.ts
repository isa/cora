import { readFile } from 'fs/promises';
import { parseDiagram } from './packages/cora/src/core/parser';
import { measureNodes } from './packages/cora/src/core/measureText';
import { computeLayout } from './packages/cora/src/core/layout';
import { catalogDefaultProps } from './packages/cora/src/renderer/themes/componentDefaults';
import { renderToText } from './packages/cora/src/renderer/renderToText';

async function main() {
  const content = await readFile('examples/valid/box-arrows.yaml', 'utf-8');
  const parsed = parseDiagram(content);
  const theme = catalogDefaultProps();
  const measured = measureNodes(parsed, theme);
  const layouted = await computeLayout({ diagram: parsed, measuredNodes: measured, theme });
  // We want to see the grid points!
  console.log(JSON.stringify(layouted.edges.find(e => e.label === 'response'), null, 2));
}
main();
