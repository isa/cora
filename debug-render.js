const fs = require('fs');
const path = 'packages/cora/src/renderer/renderToText.ts';
let code = fs.readFileSync(path, 'utf8');

const logCode = `console.log("Assigned ports keys:", Array.from(assignedPorts.keys()));
console.log("Looking for key:", \`\${edge.from}->\${edge.to}:\${edge.label ?? ''}:tgt\`);`;

code = code.replace(`    let entryPoint = preserveInfraTextLayout ?`, logCode + `\n    let entryPoint = preserveInfraTextLayout ?`);
fs.writeFileSync(path, code);
