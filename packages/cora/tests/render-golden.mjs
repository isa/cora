/**
 * Golden SVG regression runner for cora render.
 * Refresh baselines: UPDATE_GOLDEN=1 node tests/render-golden.mjs
 */
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(__dirname, '..');
const repoRoot = join(packageRoot, '../..');
const cliPath = join(packageRoot, 'dist/cli.js');
const goldenDir = join(__dirname, 'golden');

const FIXTURES = [
  'box-arrows',
  'flowchart',
  'microservice',
  'infra',
  'database',
];

function normalizeSvg(svg) {
  return svg
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .replace(/\s+/g, ' ')
    .trim();
}

function assertInvariants(svg, kind) {
  if (svg.includes('foreignObject')) {
    throw new Error(`${kind}: output must not contain foreignObject`);
  }
  if (!svg.includes('xmlns="http://www.w3.org/2000/svg"')) {
    throw new Error(`${kind}: output missing xmlns`);
  }
  if (!svg.includes('viewBox')) {
    throw new Error(`${kind}: output missing viewBox`);
  }
}

function renderFixture(kind) {
  if (!existsSync(cliPath)) {
    throw new Error(`Build required: missing ${cliPath}. Run bun run build first.`);
  }

  const input = join(repoRoot, 'examples/valid', `${kind}.yaml`);
  const tmpDir = mkdtempSync(join(tmpdir(), 'cora-golden-'));
  const output = join(tmpDir, `${kind}.svg`);

  execFileSync(process.execPath, [cliPath, 'render', input, '-o', output], {
    stdio: 'pipe',
  });

  return readFileSync(output, 'utf8');
}

function firstDiffLine(a, b) {
  const aLines = a.split('\n');
  const bLines = b.split('\n');
  const max = Math.max(aLines.length, bLines.length);
  for (let i = 0; i < max; i++) {
    if (aLines[i] !== bLines[i]) {
      return i + 1;
    }
  }
  return -1;
}

let passed = 0;
let failed = 0;

for (const kind of FIXTURES) {
  const goldenPath = join(goldenDir, `${kind}.svg`);
  const fresh = renderFixture(kind);
  assertInvariants(fresh, kind);

  if (process.env.UPDATE_GOLDEN === '1') {
    writeFileSync(goldenPath, fresh, 'utf8');
    console.log(`updated ${goldenPath}`);
    passed++;
    continue;
  }

  if (!existsSync(goldenPath)) {
    console.error(`FAIL ${kind}: missing golden file ${goldenPath}`);
    failed++;
    continue;
  }

  const golden = readFileSync(goldenPath, 'utf8');
  const normFresh = normalizeSvg(fresh);
  const normGolden = normalizeSvg(golden);

  if (normFresh !== normGolden) {
    const line = firstDiffLine(normFresh, normGolden);
    console.error(`FAIL ${kind}: differs from golden (first change near line ${line})`);
    failed++;
    continue;
  }

  console.log(`PASS ${kind}`);
  passed++;
}

console.log(`${passed}/${FIXTURES.length} golden checks passed`);

if (failed > 0) {
  process.exit(1);
}
