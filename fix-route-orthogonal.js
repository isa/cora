const fs = require('fs');
const path = 'packages/cora/src/renderer/renderToText.ts';
let code = fs.readFileSync(path, 'utf8');

const matchStr = `    if (elkEdge.points.length === 2) {
      // Simple direct edge - just connect exit to entry
      points = routeOrthogonal(exitPoint, entryPoint, isVertical);
    } else {`;

const replaceStr = `    if (elkEdge.points.length === 2) {
      // Simple direct edge - just connect exit to entry
      if (!preserveInfraTextLayout && exitPoint.x !== entryPoint.x && exitPoint.y !== entryPoint.y) {
        if (isVertical) {
          const midY = Math.round((exitPoint.y + entryPoint.y) / 2);
          points = [exitPoint, { x: exitPoint.x, y: midY }, { x: entryPoint.x, y: midY }, entryPoint];
        } else {
          const midX = Math.round((exitPoint.x + entryPoint.x) / 2);
          points = [exitPoint, { x: midX, y: exitPoint.y }, { x: midX, y: entryPoint.y }, entryPoint];
        }
      } else {
        points = routeOrthogonal(exitPoint, entryPoint, isVertical);
      }
    } else {`;

code = code.replace(matchStr, replaceStr);
fs.writeFileSync(path, code);
