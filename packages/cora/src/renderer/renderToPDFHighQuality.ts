/**
 * `--quality=high` PDF render path — drives headless Chromium via
 * Playwright. Dynamic-imported only by `render.ts` when the user passes
 * `--quality=high`; default-path users (resvg + pdf-lib) pay zero
 * Playwright load cost.
 *
 * The harness HTML wraps the renderer SVG with an explicit `@page` size
 * and a margin/padding reset to defeat Chromium's default 8px body
 * margin (Pitfall 5).
 *
 * Failures throw `HighQualityRenderError` so render.ts can emit a
 * structured `HIGH_QUALITY_RENDER_FAILED` JSON error rather than
 * letting the rejection fall through to the PARSE_ERROR handler.
 */
import { CHROMIUM_DIR } from '../cli/paths.js';
import {
  computePageGeometry,
  extractSvgViewBox,
  type PageName,
} from './pdf/pageSize.js';

export class HighQualityRenderError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = 'HighQualityRenderError';
  }
}

export interface RenderToPDFHighQualityOptions {
  /** Target page size. Absent → fit-to-content (page = svg bbox + 2*margin). */
  page?: PageName;
  /** Override the default 24pt margin (only used in fit-to-content). */
  margin?: number;
}

/** Convert PDF points to inches. Playwright's `page.pdf({width, height})`
 *  accepts values labeled with `in`, `mm`, `cm`, or `px` — NOT `pt`.
 *  We round to a precision that survives floating point cleanly
 *  (Playwright re-serializes the string for CDP). */
function ptToInches(pt: number): string {
  return `${(pt / 72).toFixed(4)}in`;
}

export async function renderToPDFHighQuality(
  svg: string,
  opts: RenderToPDFHighQualityOptions = {},
): Promise<Buffer> {
  // Point Playwright at Cora's cache dir (NOT ~/.cache/ms-playwright/).
  // We set this BEFORE importing playwright so chromium.launch() resolves
  // the executable from our location. Static `import` at module top would
  // be wrong: playwright reads PLAYWRIGHT_BROWSERS_PATH at load time.
  if (!process.env.PLAYWRIGHT_BROWSERS_PATH) {
    process.env.PLAYWRIGHT_BROWSERS_PATH = CHROMIUM_DIR;
  }

  // Match the default-path's page sizing: use the viewBox (which the
  // renderer pads to 24pt around the diagram bbox), not raw width/
  // height attrs. Keeps default and high-quality outputs the same size
  // for the same input diagram.
  const viewBox = extractSvgViewBox(svg);
  const { pageW, pageH } = computePageGeometry(
    { width: viewBox.width, height: viewBox.height },
    { page: opts.page, margin: opts.margin },
  );

  const html = `<!doctype html>
<html><head><style>
  @page { size: ${pageW}pt ${pageH}pt; margin: 0; }
  html, body { margin: 0; padding: 0; }
  svg { display: block; width: ${pageW}pt; height: ${pageH}pt; }
</style></head><body>${svg}</body></html>`;

  let chromium: typeof import('playwright').chromium;
  try {
    ({ chromium } = await import('playwright'));
  } catch (err) {
    throw new HighQualityRenderError(
      'Could not load the bundled `playwright` module.',
      err,
    );
  }

  let browser: import('playwright').Browser;
  try {
    browser = await chromium.launch({ headless: true });
  } catch (err) {
    throw new HighQualityRenderError(
      `Could not launch headless Chromium: ${(err as Error).message}`,
      err,
    );
  }

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle' });
    const buf = await page.pdf({
      // Playwright accepts `in`/`mm`/`cm`/`px` — NOT `pt`. We rely on
      // `preferCSSPageSize: true` + the `@page { size: …pt …pt }` rule
      // to honor exact-point dimensions; width/height here is a
      // fallback for browsers that ignore preferCSSPageSize.
      width: ptToInches(pageW),
      height: ptToInches(pageH),
      printBackground: true,
      preferCSSPageSize: true,
    });
    return Buffer.from(buf);
  } catch (err) {
    throw new HighQualityRenderError(
      `Chromium failed to render the PDF: ${(err as Error).message}`,
      err,
    );
  } finally {
    await browser.close();
  }
}
