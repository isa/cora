const fs = require('fs');
const path = 'packages/cora/src/renderer/renderToText.ts';
let code = fs.readFileSync(path, 'utf8');

const logCode = `console.log("Looking for key:", \`\${edge.from}->\${edge.to}:\${edge.label ?? ''}:tgt\`, "Found:", assignedPorts.get(\`\${edge.from}->\${edge.to}:\${edge.label ?? ''}:tgt\`));`;

code = code.replace(`console.log("Looking for key:", \`\${edge.from}->\${edge.to}:\${edge.label ?? ''}:tgt\`);`, logCode);
fs.writeFileSync(path, code);
