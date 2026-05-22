/**
 * `--quality=high` PDF render path — drives headless Chromium via
 * Playwright. Dynamic-imported only by `render.ts` when the user passes
 * `--quality=high`; default-path users (resvg + pdf-lib) pay zero
 * Playwright load cost.
 *
 * The harness HTML wraps the renderer SVG with an explicit `@page` size
 * and a margin/padding reset to defeat Chromium's default 8px body
 * margin (Pitfall 5).
 */
import { CHROMIUM_DIR } from '../cli/paths.js';
import {
  computePageGeometry,
  extractSvgDimensions,
  type PageName,
} from './pdf/pageSize.js';

export interface RenderToPDFHighQualityOptions {
  /** Target page size. Absent → fit-to-content (page = svg bbox + 2*margin). */
  page?: PageName;
  /** Override the default 24pt margin (only used in fit-to-content). */
  margin?: number;
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

  const { chromium } = await import('playwright');
  const { width, height } = extractSvgDimensions(svg);
  const { pageW, pageH } = computePageGeometry(
    { width, height },
    { page: opts.page, margin: opts.margin },
  );

  const html = `<!doctype html>
<html><head><style>
  @page { size: ${pageW}pt ${pageH}pt; margin: 0; }
  html, body { margin: 0; padding: 0; }
  svg { display: block; width: ${pageW}pt; height: ${pageH}pt; }
</style></head><body>${svg}</body></html>`;

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle' });
    const buf = await page.pdf({
      width: `${pageW}pt`,
      height: `${pageH}pt`,
      printBackground: true,
      preferCSSPageSize: true,
    });
    return Buffer.from(buf);
  } finally {
    await browser.close();
  }
}
