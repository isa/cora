import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, rgb, type PDFFont } from 'pdf-lib';

import type { LayoutedDiagram } from '../layout-ir.js';
import { pdfLibFontBuffers, resvgFontBuffers } from './assets/fonts.js';
import { svgToPdf } from './pdf/coords.js';
import {
  computePageGeometry,
  scaleSvgToPage,
  type PageName,
} from './pdf/pageSize.js';
import { rasteriseWithWarningCapture } from './pdf/resvgCapture.js';
import { buildTextOverlay, type TextDraw } from './pdf/textOverlay.js';

/**
 * Baseline factor applied to convert a TextDraw center-Y into the
 * pdf-lib `drawText` Y argument (which is the text baseline). A
 * font's visual center sits roughly 0.3 * fontSize below the baseline
 * for Noto Sans at typical UI sizes. This is a single named constant
 * so the position-tolerance test in `tests/pdf/render-pdf.test.ts`
 * imports the same value the production code uses.
 */
export const BASELINE_FACTOR = 0.3;

/** Rasterisation oversample factor: render the SVG at 2x for crisp
 *  bitmap quality, then downscale on `drawImage` to logical page coords. */
const RASTER_SCALE = 2;

export interface RenderToPDFOptions {
  /** Target page size. If absent, page is fit-to-content (bbox + 2*margin). */
  page?: PageName;
  /** Override the default 24pt margin. */
  margin?: number;
  /** When true, a non-empty resvg warnings array throws. Mapped to D-11
   *  CI semantics: any font-family the renderer can't resolve is a
   *  regression and must fail the run. */
  ciMode?: boolean;
}

function hexToColor(hex: string): { r: number; g: number; b: number } {
  // Accept #rgb / #rrggbb. Fall back to black on parse failure rather
  // than throwing — text color is decorative; we don't want a malformed
  // theme to brick the whole PDF export.
  const m6 = /^#?([0-9a-fA-F]{6})$/.exec(hex);
  if (m6) {
    const v = parseInt(m6[1]!, 16);
    return { r: ((v >> 16) & 0xff) / 255, g: ((v >> 8) & 0xff) / 255, b: (v & 0xff) / 255 };
  }
  const m3 = /^#?([0-9a-fA-F]{3})$/.exec(hex);
  if (m3) {
    const s = m3[1]!;
    const r = parseInt(s[0]! + s[0]!, 16) / 255;
    const g = parseInt(s[1]! + s[1]!, 16) / 255;
    const b = parseInt(s[2]! + s[2]!, 16) / 255;
    return { r, g, b };
  }
  return { r: 0, g: 0, b: 0 };
}

/**
 * Default PDF render path: resvg rasterises the vector layer (minus
 * <text> elements), pdf-lib embeds it as a PNG background, and the
 * IR-driven `buildTextOverlay()` emits selectable text on top using
 * the bundled Noto Sans Regular + SemiBold TTFs.
 *
 * The shape mirrors `renderToPNG.ts` (pure function over IR + SVG
 * string, no I/O beyond reading bundled fonts). Y-flip and text
 * measurement live in this module only; textOverlay.ts is pure data.
 */
export async function renderToPDF(
  layouted: LayoutedDiagram,
  svg: string,
  options: RenderToPDFOptions = {},
): Promise<Uint8Array> {
  const { pageW, pageH, scale, offsetX, offsetY } = computePageGeometry(
    layouted,
    options,
  );

  // 1. Strip <text> from SVG so resvg only rasterises shapes/paths.
  //    The selectable-text layer is added by pdf-lib below.
  const svgVectorOnly = svg.replace(/<text\b[^>]*>[\s\S]*?<\/text>/g, '');

  // 2. Scale up for crisp rasterisation, then downscale on drawImage.
  const svgForRaster = scaleSvgToPage(svgVectorOnly, scale * RASTER_SCALE);

  // 3. Rasterise vector layer with warning capture. We scan the
  //    ORIGINAL svg (text included) for unresolved font-family
  //    declarations — that's the D-11 regression signal. The actual
  //    page background is rasterised from `svgForRaster` (text
  //    stripped). Warnings from both invocations are merged.
  const resvgFont = {
    fontBuffers: resvgFontBuffers(),
    loadSystemFonts: false,
    defaultFontFamily: 'Noto Sans',
    sansSerifFamily: 'Noto Sans',
  } as unknown as never;
  const probe = rasteriseWithWarningCapture(svg, { font: resvgFont });
  const { png, warnings: rasterWarnings } = rasteriseWithWarningCapture(
    svgForRaster,
    { font: resvgFont },
  );
  // probe.png is discarded — its only role was the warning scan.
  void probe.png;
  const warnings = [...probe.warnings, ...rasterWarnings];
  if (options.ciMode && warnings.length > 0) {
    throw new Error(
      `resvg font warnings in CI mode: ${warnings.join('; ')}`,
    );
  }

  // 4. Build the PDF document and embed fonts.
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const { regular: regularBuf, semibold: semiboldBuf } = pdfLibFontBuffers();
  const [regular, semibold] = await Promise.all([
    doc.embedFont(regularBuf, { subset: true }),
    doc.embedFont(semiboldBuf, { subset: true }),
  ]);
  const page = doc.addPage([pageW, pageH]);
  const image = await doc.embedPng(png);

  // 5. Draw the rasterised vector background. The PNG is at
  //    `scale * RASTER_SCALE`, so the on-page width is png.width /
  //    RASTER_SCALE (which equals layouted.width * scale).
  //    drawImage uses bottom-left as the anchor; map SVG (0, height)
  //    — the top-left in SVG space — through svgToPdf to get the
  //    bottom-left in PDF space.
  const imgPageHeight = image.height / RASTER_SCALE;
  const { x: imgX, y: imgY } = svgToPdf(
    0,
    imgPageHeight / scale,
    pageH,
    scale,
    offsetX,
    offsetY,
  );
  page.drawImage(image, {
    x: imgX,
    y: imgY,
    width: image.width / RASTER_SCALE,
    height: imgPageHeight,
  });

  // 6. Overlay selectable text driven by the IR. All Y-flip / text
  //    measurement lives in this single loop.
  for (const draw of buildTextOverlay(layouted)) {
    const font: PDFFont = draw.weight === 'semibold' ? semibold : regular;
    const drawSize = draw.size * scale;
    const { x: cxPdf, y: cyPdf } = svgToPdf(
      draw.cx,
      draw.cy,
      pageH,
      scale,
      offsetX,
      offsetY,
    );
    let pdfX: number;
    let pdfY: number;
    if (draw.anchor === 'center') {
      const textWidth = font.widthOfTextAtSize(draw.text, drawSize);
      pdfX = cxPdf - textWidth / 2;
      pdfY = cyPdf - drawSize * BASELINE_FACTOR;
    } else {
      // 'top-left': cx is left edge, cy is top edge in SVG space.
      // svgToPdf already flipped Y; the baseline sits below the top
      // edge by roughly fontSize (ascent ≈ 1.0 * fontSize for Noto).
      pdfX = cxPdf;
      pdfY = cyPdf - drawSize;
    }
    const { r, g, b } = hexToColor(draw.color);
    page.drawText(draw.text, {
      x: pdfX,
      y: pdfY,
      font,
      size: drawSize,
      color: rgb(r, g, b),
    });
  }

  return doc.save();
}

// Re-export for downstream callers that only want the type.
export type { TextDraw };
