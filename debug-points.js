const fs = require('fs');
const path = 'packages/cora/src/renderer/renderToText.ts';
let code = fs.readFileSync(path, 'utf8');

const logCode = `    if (edge.from === 'B' && edge.to === 'D') {
      console.log("FINAL POINTS B->D:", points);
    }`;

code = code.replace(`    // Find the best segment for the label and place it avoiding collisions`, logCode + `\n    // Find the best segment for the label and place it avoiding collisions`);
fs.writeFileSync(path, code);
