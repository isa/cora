import { readFile } from 'fs/promises';
import { parseFile, applyNodeStyles, measureNodes, resolveTheme, computeLayout } from './packages/cora/src/core/index';
import { defaultTheme } from './packages/cora/src/renderer/themes/default';
import { renderToText } from './packages/cora/src/renderer/renderToText';

async function main() {
  const parsed = await parseFile('examples/valid/microservice.yaml');
  const doc = parsed.document as any;
  const { nodeStyles, theme } = resolveTheme(doc.diagram, defaultTheme);
  const measured = applyNodeStyles(measureNodes(doc.diagram.nodes), nodeStyles);
  const layouted = await computeLayout({
    diagram: doc.diagram,
    measuredNodes: measured,
    theme,
  });

  // Scale calculations in renderToText:
  let minX = Infinity, minY = Infinity;
  for (const node of layouted.nodes) {
    minX = Math.min(minX, node.x);
    minY = Math.min(minY, node.y);
  }
  for (const group of layouted.groups ?? []) {
    minX = Math.min(minX, group.x);
    minY = Math.min(minY, group.y);
  }
  for (const edge of layouted.edges) {
    for (const point of edge.points) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
    }
  }
  const SCALE_X = 10;
  const SCALE_Y = 18;
  const GRID_PADDING = 2;
  const toGridX = (px: number) => Math.round((px - minX) / SCALE_X) + GRID_PADDING;
  const toGridY = (px: number) => Math.round((px - minY) / SCALE_Y) + GRID_PADDING;

  console.log("=== SCALE ===");
  console.log(`minX=${minX}, minY=${minY}`);

  console.log("=== GRID NODES & GROUPS ===");
  // Let's call renderToText to make sure we get the final layouted coordinates of the gridNodes after overlap resolution
  // Wait, we can copy the gridNodes map from the renderToText execution, or we can just run a custom log from inside packages/cora/src/renderer/renderToText.ts!
  // Wait! Let's print from inside renderToText.ts itself by writing to a file or using console.log.
  // Actually, we can just edit packages/cora/src/renderer/renderToText.ts to console.log all final gridNodes and edgeRoutes!
  // Let's do that! That is much more accurate because it runs the actual code and logs the exact state of the variables!
}
main();
