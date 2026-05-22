import { describe, it } from 'vitest';

// Plan 03-02 turns these into real tests against the default
// renderToPDF path (resvg + pdf-lib with IR-driven text overlay).
describe.skip('renderToPDF default path', () => {
  it.todo('produces valid PDF byte stream');
  it.todo('text is selectable via pdf-parse');
  it.todo('text positions match SVG within 1pt tolerance');
});
