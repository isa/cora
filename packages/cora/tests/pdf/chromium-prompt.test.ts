import { execFileSync } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '../../../..');
const cliPath = join(repoRoot, 'packages/cora/dist/cli.js');

// -----------------------------------------------------------------------------
// Predicate split — isNonInteractive + shouldAutoInstall
// -----------------------------------------------------------------------------

describe('predicate: isNonInteractive + shouldAutoInstall', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it('isNonInteractive returns true for format=json', async () => {
    const { isNonInteractive } = await import('../../src/cli/output.js');
    expect(isNonInteractive({ format: 'json' })).toBe(true);
  });

  it('isNonInteractive returns true when CI=1', async () => {
    vi.stubEnv('CI', '1');
    const { isNonInteractive } = await import('../../src/cli/output.js');
    expect(isNonInteractive({})).toBe(true);
  });

  it('isNonInteractive returns true when CI=true', async () => {
    vi.stubEnv('CI', 'true');
    const { isNonInteractive } = await import('../../src/cli/output.js');
    expect(isNonInteractive({})).toBe(true);
  });

  it('isNonInteractive returns true when stdout is not a TTY', async () => {
    // vitest runs without a TTY by default, so the unset-CI / non-json
    // case should still be non-interactive thanks to !isTTY.
    vi.stubEnv('CI', '');
    const { isNonInteractive } = await import('../../src/cli/output.js');
    expect(isNonInteractive({})).toBe(true);
  });

  it('shouldAutoInstall true when yes flag set', async () => {
    vi.stubEnv('CORA_AUTO_INSTALL', '');
    const { shouldAutoInstall } = await import('../../src/cli/output.js');
    expect(shouldAutoInstall({ yes: true })).toBe(true);
  });

  it('shouldAutoInstall true when CORA_AUTO_INSTALL=1', async () => {
    vi.stubEnv('CORA_AUTO_INSTALL', '1');
    const { shouldAutoInstall } = await import('../../src/cli/output.js');
    expect(shouldAutoInstall({})).toBe(true);
  });

  it('shouldAutoInstall false when neither flag nor env set', async () => {
    vi.stubEnv('CORA_AUTO_INSTALL', '');
    const { shouldAutoInstall } = await import('../../src/cli/output.js');
    expect(shouldAutoInstall({})).toBe(false);
  });
});

// -----------------------------------------------------------------------------
// paths.ts cross-platform resolution
// -----------------------------------------------------------------------------

describe('path: CORA_CONFIG_DIR + CHROMIUM_DIR', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it('respects CORA_CONFIG_DIR env override', async () => {
    vi.stubEnv('CORA_CONFIG_DIR', '/custom/cora-test-dir');
    const mod = await import('../../src/cli/paths.js?override');
    expect(mod.CORA_CONFIG_DIR).toBe('/custom/cora-test-dir');
    expect(mod.CHROMIUM_DIR).toBe('/custom/cora-test-dir/browsers');
  });

  it('CHROMIUM_DIR sits under CORA_CONFIG_DIR', async () => {
    vi.stubEnv('CORA_CONFIG_DIR', '/x/y');
    const mod = await import('../../src/cli/paths.js?subpath');
    expect(mod.CHROMIUM_DIR).toBe('/x/y/browsers');
  });
});

// -----------------------------------------------------------------------------
// chromiumInstalled (presence + non-empty cache dir is the install marker)
// -----------------------------------------------------------------------------

describe('chromiumInstalled', () => {
  let tmp: string;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'cora-cfg-'));
    vi.resetModules();
    vi.stubEnv('CORA_CONFIG_DIR', tmp);
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('returns false when CHROMIUM_DIR does not exist', async () => {
    const { chromiumInstalled } = await import(
      '../../src/cli/playwrightInstall.js?missing'
    );
    expect(chromiumInstalled()).toBe(false);
  });

  it('returns false when CHROMIUM_DIR exists but is empty', async () => {
    const { CHROMIUM_DIR } = await import('../../src/cli/paths.js?empty');
    mkdirSync(CHROMIUM_DIR, { recursive: true });
    const { chromiumInstalled } = await import(
      '../../src/cli/playwrightInstall.js?empty'
    );
    expect(chromiumInstalled()).toBe(false);
  });

  it('returns true when CHROMIUM_DIR has contents', async () => {
    const { CHROMIUM_DIR } = await import('../../src/cli/paths.js?populated');
    mkdirSync(join(CHROMIUM_DIR, 'chromium-fake'), { recursive: true });
    const { chromiumInstalled } = await import(
      '../../src/cli/playwrightInstall.js?populated'
    );
    expect(chromiumInstalled()).toBe(true);
  });
});

// -----------------------------------------------------------------------------
// installChromium spawn — explicit allowlisted env (T-03-02 mitigation)
// -----------------------------------------------------------------------------

describe('installChromium spawn invocation', () => {
  let tmp: string;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'cora-cfg-'));
    vi.resetModules();
    vi.stubEnv('CORA_CONFIG_DIR', tmp);
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
    vi.unstubAllEnvs();
    vi.resetModules();
    vi.doUnmock('node:child_process');
  });

  it('spawns playwright install chromium with PLAYWRIGHT_BROWSERS_PATH and no ...process.env spread', async () => {
    type SpawnCall = {
      cmd: string;
      args: string[];
      opts: { env?: Record<string, string>; stdio?: unknown };
    };
    const calls: SpawnCall[] = [];

    vi.doMock('node:child_process', () => ({
      spawn: (cmd: string, args: string[], opts: SpawnCall['opts']) => {
        calls.push({ cmd, args, opts });
        return {
          on: (event: string, cb: (code: number) => void) => {
            if (event === 'exit') setTimeout(() => cb(0), 0);
          },
        };
      },
    }));

    const { installChromium } = await import(
      '../../src/cli/playwrightInstall.js?spawn-test'
    );
    const { CHROMIUM_DIR } = await import('../../src/cli/paths.js?spawn-test');
    await installChromium({ quiet: true });

    expect(calls).toHaveLength(1);
    const [call] = calls;
    // We spawn `node <playwright/cli.js> install chromium` rather than
    // `npx playwright install chromium` — npx walks up from cwd to
    // resolve packages, and the cora binary is typically run from a
    // parent directory where playwright isn't installed.
    expect(call!.cmd).toBe(process.execPath);
    expect(call!.args.length).toBe(3);
    expect(call!.args[0]).toMatch(/playwright[\/\\]cli\.js$/);
    expect(call!.args.slice(1)).toEqual(['install', 'chromium']);
    expect(call!.opts.env?.PLAYWRIGHT_BROWSERS_PATH).toBe(CHROMIUM_DIR);
    expect(call!.opts.stdio).toBe('pipe');

    // T-03-02: env MUST be an allowlist, NOT a spread of process.env.
    // Assert that arbitrary host env vars do NOT leak through.
    const sensitive = ['NODE_OPTIONS', 'npm_config_registry', 'PATH_INFO'];
    // Seed at least one to verify isolation when present in process.env.
    process.env.NODE_OPTIONS = '--require=evil.js';
    try {
      // Re-run a second install to capture a fresh call with the seeded env.
      await installChromium({ quiet: true });
    } finally {
      delete process.env.NODE_OPTIONS;
    }
    const second = calls[1]!;
    for (const key of sensitive) {
      expect(second.opts.env).not.toHaveProperty(key);
    }
    // The keys present must be a subset of the allowlist (proxy/cert
    // vars are forwarded conditionally; only PATH/HOME/LOCALAPPDATA/
    // PLAYWRIGHT_BROWSERS_PATH are always set).
    const allowed = [
      'PATH',
      'HOME',
      'LOCALAPPDATA',
      'PLAYWRIGHT_BROWSERS_PATH',
      'HTTPS_PROXY',
      'HTTP_PROXY',
      'NO_PROXY',
      'NODE_EXTRA_CA_CERTS',
    ];
    for (const key of Object.keys(second.opts.env ?? {})) {
      expect(allowed).toContain(key);
    }
  });

  it('rejects when spawn exits non-zero', async () => {
    vi.doMock('node:child_process', () => ({
      spawn: () => ({
        on: (event: string, cb: (code: number) => void) => {
          if (event === 'exit') setTimeout(() => cb(2), 0);
        },
      }),
    }));
    const { installChromium } = await import(
      '../../src/cli/playwrightInstall.js?spawn-fail'
    );
    await expect(installChromium({ quiet: true })).rejects.toThrow(
      /exited 2/,
    );
    // And the error type is the dedicated ChromiumInstallError so the
    // CLI can emit CHROMIUM_INSTALL_FAILED (not PARSE_ERROR).
    const { ChromiumInstallError } = await import(
      '../../src/cli/playwrightInstall.js?spawn-fail'
    );
    await expect(installChromium({ quiet: true })).rejects.toBeInstanceOf(
      ChromiumInstallError,
    );
  });
});

// -----------------------------------------------------------------------------
// End-to-end CLI: CHROMIUM_NOT_INSTALLED JSON error + --yes triggers install
// -----------------------------------------------------------------------------

describe('cora render --quality=high CLI integration', () => {
  let cfgDir: string;
  let outDir: string;

  beforeEach(() => {
    cfgDir = mkdtempSync(join(tmpdir(), 'cora-cfg-'));
    outDir = mkdtempSync(join(tmpdir(), 'cora-out-'));
  });

  afterEach(() => {
    rmSync(cfgDir, { recursive: true, force: true });
    rmSync(outDir, { recursive: true, force: true });
  });

  function runCli(args: string[], env: NodeJS.ProcessEnv): {
    status: number | null;
    stdout: string;
    stderr: string;
  } {
    try {
      const stdout = execFileSync(process.execPath, [cliPath, ...args], {
        env: { ...process.env, ...env },
        encoding: 'utf8',
      });
      return { status: 0, stdout, stderr: '' };
    } catch (error) {
      const e = error as { status: number; stdout?: string; stderr?: string };
      return {
        status: e.status ?? 1,
        stdout: e.stdout?.toString() ?? '',
        stderr: e.stderr?.toString() ?? '',
      };
    }
  }

  it('emits CHROMIUM_NOT_INSTALLED JSON when non-interactive + missing chromium', () => {
    if (!existsSync(cliPath)) {
      throw new Error(`CLI not built at ${cliPath}; run \`bun run build\` first`);
    }
    const input = join(repoRoot, 'examples/valid/box-arrows.yaml');
    const output = join(outDir, 'out.pdf');
    const result = runCli(
      ['render', input, '-o', output, '--quality=high', '--format=json'],
      { CORA_CONFIG_DIR: cfgDir, CORA_AUTO_INSTALL: '' },
    );

    expect(result.status).not.toBe(0);
    const combined = result.stdout + result.stderr;
    expect(combined).toContain('CHROMIUM_NOT_INSTALLED');
    expect(combined).toContain('/quality');

    // Parse the JSON shape (printed on stdout per existing render.ts pattern).
    const parsed = JSON.parse(result.stdout) as Array<{
      code: string;
      path: string;
      message: string;
      suggestion?: string;
    }>;
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed[0]!.code).toBe('CHROMIUM_NOT_INSTALLED');
    expect(parsed[0]!.path).toBe('/quality');
    expect(parsed[0]!.message).toMatch(/--yes|CORA_AUTO_INSTALL/);
    expect(parsed[0]!.suggestion).toBeTruthy();
  });

  it('--yes triggers install via CORA_TEST_PLAYWRIGHT_INSTALL_STUB', () => {
    if (!existsSync(cliPath)) {
      throw new Error(`CLI not built at ${cliPath}; run \`bun run build\` first`);
    }

    // Write a stub script that simulates `playwright install chromium`:
    // it just creates the expected directory and exits 0.
    const stub = join(outDir, 'install-stub.sh');
    const marker = join(cfgDir, 'browsers/chromium-stub');
    writeFileSync(
      stub,
      `#!/bin/sh\nmkdir -p "${marker}"\necho "stub-fired" > "${marker}/.invoked"\nexit 0\n`,
    );
    chmodSync(stub, 0o755);

    const input = join(repoRoot, 'examples/valid/box-arrows.yaml');
    const output = join(outDir, 'out.pdf');
    const result = runCli(
      ['render', input, '-o', output, '--quality=high', '--format=json', '--yes'],
      {
        CORA_CONFIG_DIR: cfgDir,
        CORA_TEST_PLAYWRIGHT_INSTALL_STUB: stub,
      },
    );

    // The stub fires, marker exists. The actual render will likely fail
    // because the stub didn't install a real Chromium — we don't assert
    // exit code 0 here; we only assert install plumbing fired.
    expect(existsSync(join(marker, '.invoked'))).toBe(true);
    void result; // exit code is irrelevant for this assertion.

    // And: no CHROMIUM_NOT_INSTALLED in output — install path was taken.
    const combined = result.stdout + result.stderr;
    expect(combined).not.toContain('CHROMIUM_NOT_INSTALLED');
    expect(readdirSync(join(cfgDir, 'browsers'))).toContain('chromium-stub');
  });
});
