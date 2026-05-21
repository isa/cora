import type { DiagramFile, LayoutedDiagram } from './types.js';
import { renderToSVG } from '../renderer/renderToSVG.js';
import { computeLayout } from './layout.js';
import { measureNodes } from './measureText.js';
import { applyNodeStyles, resolveTheme } from './themeResolver.js';
import { validateDiagram } from './validator.js';

export async function renderDiagram(
  document: unknown,
  defaultTheme: import('./types.js').ThemeTokens,
): Promise<{ svg: string; layouted: LayoutedDiagram }> {
  const errors = validateDiagram(document);
  if (errors.length > 0) {
    throw new Error(`Validation failed with ${errors.length} error(s)`);
  }

  const doc = document as DiagramFile;
  const { nodeStyles, theme } = resolveTheme(doc.diagram, defaultTheme);
  const measured = applyNodeStyles(
    measureNodes(doc.diagram.nodes),
    nodeStyles,
  );
  const layouted = await computeLayout({
    diagram: doc.diagram,
    measuredNodes: measured,
    theme,
  });

  return { svg: renderToSVG(layouted), layouted };
}

export { LayoutError } from './layout.js';
export { measureLabel, measureNodes, baselineYForVisualCenter } from './measureText.js';
export { computeLayout } from './layout.js';
export { createElkWorker, runElkLayout, terminateElkWorker } from './layoutWorker.js';
export { applyNodeStyles, resolveTheme } from './themeResolver.js';
