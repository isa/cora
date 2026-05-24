const fs = require('fs');
const path = 'packages/cora/src/renderer/renderToText.ts';
let code = fs.readFileSync(path, 'utf8');

// 1. Before `const gridNodes`, we inject the port counting
const step1Marker = "  // 1. Create grid nodes at their scaled positions";
const portCountLogic = `
  const portCounts = new Map<string, number>();
  if (!preserveInfraTextLayout) {
    for (const edge of layouted.edges) {
      const origSrc = layouted.nodes.find(n => n.id === edge.from);
      const origTgt = layouted.nodes.find(n => n.id === edge.to);
      if (!origSrc || !origTgt) continue;
      
      const elkEdge = layouted.edges.find(e => e.from === edge.from && e.to === edge.to)!;
      if (!elkEdge || !elkEdge.points || elkEdge.points.length === 0) continue;
      const startPt = elkEdge.points[0];
      const endPt = elkEdge.points[elkEdge.points.length - 1];
      
      const sourceSide = sideFromLayoutPoint(startPt, origSrc);
      const targetSide = sideFromLayoutPoint(endPt, origTgt);
      
      const srcKey = portKey(edge.from, sourceSide);
      const tgtKey = portKey(edge.to, targetSide);
      
      portCounts.set(srcKey, (portCounts.get(srcKey) ?? 0) + 1);
      portCounts.set(tgtKey, (portCounts.get(tgtKey) ?? 0) + 1);
    }
  }

`;

code = code.replace(step1Marker, portCountLogic + step1Marker);

// 2. Modify gridNodes creation
const gridNodesMatch = `    const boxWidth = Math.max(
      textWidth(node.label) + 4,
      MIN_BOX_WIDTH,
    );
    const boxHeight = useMeasuredNodeHeight
      ? Math.max(Math.round(node.measuredHeight / SCALE_Y), BOX_HEIGHT)
      : BOX_HEIGHT;`;

const gridNodesReplacement = `    const leftPorts = preserveInfraTextLayout ? 0 : portCounts.get(portKey(node.id, 'left')) ?? 0;
    const rightPorts = preserveInfraTextLayout ? 0 : portCounts.get(portKey(node.id, 'right')) ?? 0;
    const topPorts = preserveInfraTextLayout ? 0 : portCounts.get(portKey(node.id, 'top')) ?? 0;
    const bottomPorts = preserveInfraTextLayout ? 0 : portCounts.get(portKey(node.id, 'bottom')) ?? 0;

    const minHeightForPorts = Math.max(leftPorts, rightPorts) * 2 + 1;
    const minWidthForPorts = Math.max(topPorts, bottomPorts) * 2 + 3;

    const boxWidth = Math.max(
      textWidth(node.label) + 4,
      MIN_BOX_WIDTH,
      preserveInfraTextLayout ? 0 : minWidthForPorts
    );
    const boxHeight = useMeasuredNodeHeight
      ? Math.max(Math.round(node.measuredHeight / SCALE_Y), BOX_HEIGHT, preserveInfraTextLayout ? 0 : minHeightForPorts)
      : Math.max(BOX_HEIGHT, preserveInfraTextLayout ? 0 : minHeightForPorts);`;

code = code.replace(gridNodesMatch, gridNodesReplacement);

// 3. Before edge routing (Step 4), calculate allocated ports
const step4Marker = "  // 4. Compute edge routes using final grid positions";
const portAllocLogic = `
  const assignedPorts = new Map<string, GridPoint>();
  if (!preserveInfraTextLayout) {
    function allocateEqually(node: GridNode, side: PortSide, index: number, total: number, isSource: boolean): GridPoint {
      if (total === 1) {
        return isSource ? centeredExitPoint(node, side) : centeredEntryPoint(node, side);
      }
      
      const distributeX = () => {
        const startX = node.x + 1;
        const endX = node.x + node.width - 2;
        return startX + Math.round((endX - startX) * index / (total - 1));
      };

      const distributeY = () => {
        const startY = node.y + 1;
        const endY = node.y + node.height - 2;
        return startY + Math.round((endY - startY) * index / (total - 1));
      };

      if (side === 'top') {
        return { x: distributeX(), y: isSource ? node.y - 1 : node.y };
      }
      if (side === 'bottom') {
        return { x: distributeX(), y: isSource ? node.y + node.height : node.y + node.height - 1 };
      }
      if (side === 'left') {
        return { x: isSource ? node.x - 1 : node.x, y: distributeY() };
      }
      if (side === 'right') {
        return { x: isSource ? node.x + node.width : node.x + node.width - 1, y: distributeY() };
      }
      return isSource ? centeredExitPoint(node, side) : centeredEntryPoint(node, side);
    }

    for (const node of gridNodes.values()) {
      for (const side of ['top', 'bottom', 'left', 'right'] as PortSide[]) {
        const allocs: { edge: any, isSource: boolean, sortKey: number, side: PortSide, node: GridNode }[] = [];
        for (const edge of layouted.edges) {
          if (edge.from === node.id) {
            const origSrc = layouted.nodes.find(n => n.id === node.id)!;
            const elkEdge = layouted.edges.find(e => e.from === edge.from && e.to === edge.to)!;
            if (!elkEdge || !elkEdge.points || elkEdge.points.length === 0) continue;
            const startPt = elkEdge.points[0];
            const sourceSide = sideFromLayoutPoint(startPt, origSrc);
            if (sourceSide === side) {
              allocs.push({
                edge,
                isSource: true,
                sortKey: side === 'top' || side === 'bottom' ? startPt.x : startPt.y,
                side,
                node
              });
            }
          }
          if (edge.to === node.id) {
            const origTgt = layouted.nodes.find(n => n.id === node.id)!;
            const elkEdge = layouted.edges.find(e => e.from === edge.from && e.to === edge.to)!;
            if (!elkEdge || !elkEdge.points || elkEdge.points.length === 0) continue;
            const endPt = elkEdge.points[elkEdge.points.length - 1];
            const targetSide = sideFromLayoutPoint(endPt, origTgt);
            if (targetSide === side) {
              allocs.push({
                edge,
                isSource: false,
                sortKey: side === 'top' || side === 'bottom' ? endPt.x : endPt.y,
                side,
                node
              });
            }
          }
        }
        
        if (allocs.length > 0) {
          allocs.sort((a, b) => a.sortKey - b.sortKey);
          const N = allocs.length;
          for (let i = 0; i < N; i++) {
            const alloc = allocs[i];
            const pt = allocateEqually(alloc.node, side, i, N, alloc.isSource);
            const key = \`\${alloc.edge.from}->\${alloc.edge.to}:\${alloc.edge.label ?? ''}:\${alloc.isSource ? 'src' : 'tgt'}\`;
            assignedPorts.set(key, pt);
          }
        }
      }
    }
  }

`;

code = code.replace(step4Marker, portAllocLogic + step4Marker);

// 4. Update the logic that assigns exitPoint and entryPoint
const exitEntryPointMatch = `    // Map the ELK port position proportionally onto the grid node
    let exitPoint = sourcePortPoint(srcNode, sourceSide, startPt, origSrc);
    let entryPoint = targetPortPoint(tgtNode, targetSide, endPt, origTgt);

    if (!preserveInfraTextLayout && (portUseCounts.get(portKey(edge.from, sourceSide)) ?? 0) <= 1) {
      exitPoint = centeredExitPoint(srcNode, sourceSide);
    }
    if (!preserveInfraTextLayout && (portUseCounts.get(portKey(edge.to, targetSide)) ?? 0) <= 1) {
      entryPoint = centeredEntryPoint(tgtNode, targetSide);
    }`;

const exitEntryPointReplacement = `    // Map the ELK port position proportionally onto the grid node
    let exitPoint = preserveInfraTextLayout ? sourcePortPoint(srcNode, sourceSide, startPt, origSrc) : assignedPorts.get(\`\${edge.from}->\${edge.to}:\${edge.label ?? ''}:src\`) ?? sourcePortPoint(srcNode, sourceSide, startPt, origSrc);
    let entryPoint = preserveInfraTextLayout ? targetPortPoint(tgtNode, targetSide, endPt, origTgt) : assignedPorts.get(\`\${edge.from}->\${edge.to}:\${edge.label ?? ''}:tgt\`) ?? targetPortPoint(tgtNode, targetSide, endPt, origTgt);`;

code = code.replace(exitEntryPointMatch, exitEntryPointReplacement);

fs.writeFileSync(path, code);
