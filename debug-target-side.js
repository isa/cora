const fs = require('fs');
const path = 'packages/cora/src/renderer/renderToText.ts';
let code = fs.readFileSync(path, 'utf8');

const logCode = `    if (edge.from === 'B' && edge.to === 'D') {
      console.log("targetSide for B->D is:", targetSide, "endPt:", endPt, "origTgt:", { x: origTgt.x, y: origTgt.y, width: origTgt.measuredWidth, height: origTgt.measuredHeight });
    }`;

code = code.replace(`    // Map the ELK port position proportionally onto the grid node`, logCode + `\n    // Map the ELK port position proportionally onto the grid node`);
fs.writeFileSync(path, code);
