const fs = require('fs');
const path = 'packages/cora/src/renderer/renderToText.ts';
let code = fs.readFileSync(path, 'utf8');

const matchStr = `    if (isElkStraightVertical) {
      const minOverlapX = Math.max(srcNode.x + 1, tgtNode.x + 1);
      const maxOverlapX = Math.min(srcNode.x + srcNode.width - 2, tgtNode.x + tgtNode.width - 2);
      if (minOverlapX <= maxOverlapX) {
        const x = clamp(Math.round((exitPoint.x + entryPoint.x) / 2), minOverlapX, maxOverlapX);
        exitPoint.x = x;
        entryPoint.x = x;
      }
    } else if (isElkStraightHorizontal) {
      const minOverlapY = Math.max(srcNode.y + 1, tgtNode.y + 1);
      const maxOverlapY = Math.min(srcNode.y + srcNode.height - 2, tgtNode.y + tgtNode.height - 2);
      if (minOverlapY <= maxOverlapY) {
        const y = clamp(Math.round((exitPoint.y + entryPoint.y) / 2), minOverlapY, maxOverlapY);
        exitPoint.y = y;
        entryPoint.y = y;
      }
    }`;

const replaceStr = `    if (preserveInfraTextLayout && isElkStraightVertical) {
      const minOverlapX = Math.max(srcNode.x + 1, tgtNode.x + 1);
      const maxOverlapX = Math.min(srcNode.x + srcNode.width - 2, tgtNode.x + tgtNode.width - 2);
      if (minOverlapX <= maxOverlapX) {
        const x = clamp(Math.round((exitPoint.x + entryPoint.x) / 2), minOverlapX, maxOverlapX);
        exitPoint.x = x;
        entryPoint.x = x;
      }
    } else if (preserveInfraTextLayout && isElkStraightHorizontal) {
      const minOverlapY = Math.max(srcNode.y + 1, tgtNode.y + 1);
      const maxOverlapY = Math.min(srcNode.y + srcNode.height - 2, tgtNode.y + tgtNode.height - 2);
      if (minOverlapY <= maxOverlapY) {
        const y = clamp(Math.round((exitPoint.y + entryPoint.y) / 2), minOverlapY, maxOverlapY);
        exitPoint.y = y;
        entryPoint.y = y;
      }
    }`;

code = code.replace(matchStr, replaceStr);
fs.writeFileSync(path, code);
