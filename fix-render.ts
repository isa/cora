import { readFile, writeFile } from 'fs/promises';

async function main() {
  let content = await readFile('packages/cora/src/renderer/renderToText.ts', 'utf-8');
  
  // 1. Add cleanSpikesAndCollinear
  const cleanFn = `
function cleanSpikesAndCollinear(points: GridPoint[]): GridPoint[] {
  if (points.length < 2) return points;
  let cleaned: GridPoint[] = [];
  
  for (const pt of points) {
    if (cleaned.length > 0) {
      const last = cleaned[cleaned.length - 1]!;
      if (last.x === pt.x && last.y === pt.y) continue;
    }
    
    while (cleaned.length >= 2) {
      const prev = cleaned[cleaned.length - 2]!;
      const curr = cleaned[cleaned.length - 1]!;
      
      if ((prev.x === curr.x && curr.x === pt.x) || (prev.y === curr.y && curr.y === pt.y)) {
        cleaned.pop(); // remove curr
      } else {
        break;
      }
    }
    
    if (cleaned.length > 0) {
      const last = cleaned[cleaned.length - 1]!;
      if (last.x === pt.x && last.y === pt.y) continue;
    }
    
    cleaned.push(pt);
  }
  
  return cleaned;
}
`;
  if (!content.includes('cleanSpikesAndCollinear')) {
    content = content.replace('function trimGrid', cleanFn + '\\nfunction trimGrid');
  }
  
  // 2. Apply cleanSpikesAndCollinear to result of resolveNodeCrossings
  content = content.replace(
    'points = resolveNodeCrossings(points, gridNodes, gridGroups, edge.from, edge.to, layouted);',
    'points = cleanSpikesAndCollinear(resolveNodeCrossings(points, gridNodes, gridGroups, edge.from, edge.to, layouted));'
  );
  
  // 3. Make boxWidth use measuredWidth
  content = content.replace(
    'const boxWidth = Math.max(',
    'const boxWidth = Math.max(\n      Math.round(node.measuredWidth / SCALE_X),'
  );

  await writeFile('packages/cora/src/renderer/renderToText.ts', content, 'utf-8');
}

main();
