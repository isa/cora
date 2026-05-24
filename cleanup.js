const fs = require('fs');
const path = 'packages/cora/src/renderer/renderToText.ts';
let code = fs.readFileSync(path, 'utf8');

// Remove debug logs
code = code.replace(`console.log("Assigned ports keys:", Array.from(assignedPorts.keys()));\nconsole.log("Looking for key:", \`\${edge.from}->\${edge.to}:\${edge.label ?? ''}:tgt\`, "Found:", assignedPorts.get(\`\${edge.from}->\${edge.to}:\${edge.label ?? ''}:tgt\`));\n`, '');

code = code.replace(`    if (edge.from === 'B' && edge.to === 'D') {\n      console.log("targetSide for B->D is:", targetSide, "endPt:", endPt, "origTgt:", { x: origTgt.x, y: origTgt.y, width: origTgt.measuredWidth, height: origTgt.measuredHeight });\n    }\n`, '');

code = code.replace(`    if (edge.from === 'B' && edge.to === 'D') {\n      console.log("FINAL POINTS B->D:", points);\n    }\n`, '');

fs.writeFileSync(path, code);
