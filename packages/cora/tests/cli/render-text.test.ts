import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '../../../..');
const cliPath = join(repoRoot, 'packages/cora/dist/cli.js');
const validFixture = join(repoRoot, 'examples/valid/minimal.yaml');
const invalidFixture = join(repoRoot, 'examples/invalid/missing-version.yaml');

function runCli(args: string[]): {
  status: number;
  stdout: string;
  stderr: string;
} {
  try {
    const stdout = execFileSync(process.execPath, [cliPath, ...args], {
      encoding: 'utf8',
    });
    return { status: 0, stdout, stderr: '' };
  } catch (error) {
    const e = error as { status?: number; stdout?: string; stderr?: string };
    return {
      status: e.status ?? 1,
      stdout: e.stdout?.toString() ?? '',
      stderr: e.stderr?.toString() ?? '',
    };
  }
}

describe('cora render text output', () => {
  let outDir: string;

  beforeEach(() => {
    if (!existsSync(cliPath)) {
      throw new Error(`CLI not built at ${cliPath}; run \`bun run build\` first`);
    }
    outDir = mkdtempSync(join(tmpdir(), 'cora-render-text-'));
  });

  afterEach(() => {
    rmSync(outDir, { recursive: true, force: true });
  });

  it('prints text to stdout when no output path is provided', () => {
    const result = runCli(['render', validFixture]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('API');
    expect(result.stdout).toContain('Database');
    expect(result.stdout).toContain('Nodes:');
  });

  it('prints ASCII text to stdout with --charset ascii', () => {
    const result = runCli(['render', validFixture, '--charset', 'ascii']);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('API');
    expect(result.stdout).toContain('Database');
    expect(result.stdout).toContain('+');
    expect(result.stdout).toContain('-');
    expect(result.stdout).toContain('|');
    expect(result.stdout).not.toMatch(/[┌┐└┘─│]/u);
  });

  it('uses svg engine when --ascii-engine svg is specified', () => {
    const result = runCli(['render', validFixture, '--ascii-engine', 'svg']);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('API');
    expect(result.stdout).toContain('Database');
    expect(result.stdout).toMatch(/[┌┐└┘─│]/u);
  });

  it('uses svg engine with --charset ascii', () => {
    const result = runCli([
      'render',
      validFixture,
      '--ascii-engine',
      'svg',
      '--charset',
      'ascii',
    ]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('API');
    expect(result.stdout).toContain('Database');
    expect(result.stdout).toContain('+');
    expect(result.stdout).toContain('-');
    expect(result.stdout).toContain('|');
    expect(result.stdout).not.toMatch(/[┌┐└┘─│]/u);
  });

  it('fails when invalid value is passed to --ascii-engine', () => {
    const result = runCli(['render', validFixture, '--ascii-engine', 'invalid']);

    expect(result.status).not.toBe(0);
    expect(result.stdout + result.stderr).toContain('Invalid --ascii-engine value');
  });

  it('writes .txt output files', () => {
    const output = join(outDir, 'diagram.txt');
    const result = runCli(['render', validFixture, '-o', output]);

    expect(result.status).toBe(0);
    const text = readFileSync(output, 'utf8');
    expect(text).toContain('API');
    expect(text).toContain('Database');
  });

  it('keeps --format json as structured failure output', () => {
    const result = runCli(['render', invalidFixture, '--format', 'json']);

    expect(result.status).not.toBe(0);
    const parsed = JSON.parse(result.stdout) as Array<{ code: string }>;
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed[0]!.code).toBe('SCHEMA_VIOLATION');
  });

  it('mentions .txt in unsupported extension errors', () => {
    const output = join(outDir, 'diagram.xyz');
    const result = runCli(['render', validFixture, '-o', output]);
    const combined = result.stdout + result.stderr;

    expect(result.status).not.toBe(0);
    expect(combined).toContain('.svg');
    expect(combined).toContain('.png');
    expect(combined).toContain('.pdf');
    expect(combined).toContain('.txt');
  });
});
