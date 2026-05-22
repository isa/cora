/**
 * SVG → PDF coordinate transform. SVG uses y-down, origin top-left; PDF
 * uses y-up, origin bottom-left. This helper owns the only Y-flip in
 * the PDF render path (Pitfall 3 from 03-RESEARCH.md): every caller
 * routes through here so the formula is never inlined.
 *
 * Formula:
 *   x = offsetX + svgX * scale
 *   y = pageH  - (offsetY + svgY * scale)
 */
export function svgToPdf(
  svgX: number,
  svgY: number,
  pageH: number,
  scale: number,
  offsetX: number,
  offsetY: number,
): { x: number; y: number } {
  return {
    x: offsetX + svgX * scale,
    y: pageH - (offsetY + svgY * scale),
  };
}
