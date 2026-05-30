import { describe, expect, it } from 'vitest';

import { rasteriseWithWarningCapture } from '../../src/renderer/pdf/resvgCapture.js';
import { resvgFontBuffers } from '../../src/renderer/assets/fonts.js';

const baseOpts = () => ({
  font: {
    fontBuffers: resvgFontBuffers(),
    loadSystemFonts: false,
    defaultFontFamily: 'Poppins',
    sansSerifFamily: 'Poppins',
  },
});

describe('rasteriseWithWarningCapture', () => {
  it('captures font-family warnings when SVG references an unknown family', () => {
    // Even with the bundled Noto Sans loaded (production config), an
    // SVG that asks for a different family is a regression signal —
    // D-11 mandates this becomes a non-zero exit in CI mode.
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="40" viewBox="0 0 120 40">
      <text x="10" y="20" font-family="DefinitelyNotInstalledFont" font-size="14">hello</text>
    </svg>`;
    const { png, warnings } = rasteriseWithWarningCapture(svg, baseOpts());
    expect(png).toBeInstanceOf(Buffer);
    expect(png.length).toBeGreaterThan(0);
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings.some((w) => /font-family/i.test(w))).toBe(true);
  });

  it('returns empty warnings when using bundled Poppins', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="40" viewBox="0 0 120 40">
      <text x="10" y="20" font-family="Poppins" font-size="14">hello</text>
    </svg>`;
    const { png, warnings } = rasteriseWithWarningCapture(svg, baseOpts());
    expect(png).toBeInstanceOf(Buffer);
    expect(png.length).toBeGreaterThan(0);
    expect(warnings).toEqual([]);
  });

  it('returns empty warnings when using bundled Noto Sans', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="40" viewBox="0 0 120 40">
      <text x="10" y="20" font-family="Noto Sans" font-size="14">hello</text>
    </svg>`;
    const { png, warnings } = rasteriseWithWarningCapture(svg, baseOpts());
    expect(png).toBeInstanceOf(Buffer);
    expect(png.length).toBeGreaterThan(0);
    expect(warnings).toEqual([]);
  });

  it('restores process.stderr.write after the call (even on exception)', () => {
    const originalWrite = process.stderr.write;
    try {
      // Pass clearly invalid SVG to trigger an error in Resvg constructor
      rasteriseWithWarningCapture('<not-svg-at-all/>', baseOpts());
    } catch {
      /* expected */
    }
    expect(process.stderr.write).toBe(originalWrite);
  });
});
