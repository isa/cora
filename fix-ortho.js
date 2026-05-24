const fs = require('fs');
const path = 'packages/cora/src/renderer/renderToText.ts';
let code = fs.readFileSync(path, 'utf8');

const oldOrtho = `      // Enforce orthogonality on consecutive point pairs
      for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i]!;
        const p2 = points[i + 1]!;
        if (p1.x !== p2.x && p1.y !== p2.y) {
          // Need to make it orthogonal - check original orientation
          const origP1 = elkEdge.points[i];
          const origP2 = elkEdge.points[i + 1];
          if (origP1 && origP2) {
            const oDx = Math.abs(origP2.x - origP1.x);
            const oDy = Math.abs(origP2.y - origP1.y);
            if (oDy > oDx) {
              // Was vertical - align x
              p2.x = p1.x;
            } else {
              // Was horizontal - align y
              p2.y = p1.y;
            }
          }
        }
      }`;

const newOrtho = `      // Enforce orthogonality on consecutive point pairs
      if (preserveInfraTextLayout) {
        for (let i = 0; i < points.length - 1; i++) {
          const p1 = points[i]!;
          const p2 = points[i + 1]!;
          if (p1.x !== p2.x && p1.y !== p2.y) {
            const origP1 = elkEdge.points[i];
            const origP2 = elkEdge.points[i + 1];
            if (origP1 && origP2) {
              const oDx = Math.abs(origP2.x - origP1.x);
              const oDy = Math.abs(origP2.y - origP1.y);
              if (oDy > oDx) {
                p2.x = p1.x;
              } else {
                p2.y = p1.y;
              }
            }
          }
        }
      } else {
        const newPoints = [points[0]];
        for (let i = 0; i < points.length - 1; i++) {
          const p1 = newPoints[newPoints.length - 1]!;
          const p2 = points[i + 1]!;
          if (p1.x !== p2.x && p1.y !== p2.y) {
            const origP1 = elkEdge.points[i];
            const origP2 = elkEdge.points[i + 1];
            let preferVertical = true;
            if (origP1 && origP2) {
              const oDx = Math.abs(origP2.x - origP1.x);
              const oDy = Math.abs(origP2.y - origP1.y);
              preferVertical = oDy > oDx;
            }
            
            // If the segment ends at the target port, and it's a top/bottom port, 
            // we prefer to enter vertically. So we go horizontal FIRST.
            // If it ends at a left/right port, we prefer to enter horizontally. So we go vertical FIRST.
            const isLast = (i === points.length - 2);
            if (isLast) {
               if (targetSide === 'top' || targetSide === 'bottom') {
                 preferVertical = false; // go horizontal first, then vertical into the port
               } else {
                 preferVertical = true; // go vertical first, then horizontal into the port
               }
            } else if (i === 0) {
               if (sourceSide === 'top' || sourceSide === 'bottom') {
                 preferVertical = true; // exit vertically first, then horizontal
               } else {
                 preferVertical = false; // exit horizontally first, then vertical
               }
            }

            const mid = preferVertical ? { x: p1.x, y: p2.y } : { x: p2.x, y: p1.y };
            newPoints.push(mid);
          }
          newPoints.push(p2);
        }
        points = newPoints;
      }`;

code = code.replace(oldOrtho, newOrtho);

fs.writeFileSync(path, code);
