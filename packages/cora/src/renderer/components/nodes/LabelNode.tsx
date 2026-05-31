import { baselineYForVisualCenter, measureLabel } from '../../../core/measureText.js';
import { resolveSvgFontFamily } from '../../themes/diagramFonts.js';
import { resolveComponentSize } from '../styles.js';
import { LOOK } from '../../themes/lookTokens.js';
import { EDGE_LABEL_SIZE } from '../../themes/fontTokens.js';
import { EDGE_LABEL_PADDING } from '../edges/decorations.js';
import { DEFAULT_CATALOG_SIZE } from './shared.js';
import type { BoxStyleProps } from '../types.js';

export interface LabelNodeProps extends BoxStyleProps {
  x?: number;
  y?: number;
}

/**
 * An edge label. Authored as a `label` node bound to an edge, it renders as a
 * content-tight rounded "pill" centred on its box — the opaque background hides
 * the edge line that runs behind it. This is the single edge-label renderer
 * (there is no separate `edge.label`), shared by the preview canvas and the SVG
 * export, so both look identical.
 */
export function LabelNode(props: LabelNodeProps) {
  const text = String(props.title ?? props.text ?? '').trim();
  const box = resolveComponentSize(props.size, DEFAULT_CATALOG_SIZE);
  const x = props.x ?? 0;
  const y = props.y ?? 0;
  const centerX = x + box.width / 2;
  const centerY = y + box.height / 2;

  if (!text) {
    return <g />;
  }

  const fontSize = props.titleFontSize ?? EDGE_LABEL_SIZE;
  const scale = fontSize / EDGE_LABEL_SIZE;
  const content = measureLabel(text, 'edge');
  const contentWidth = content.width * scale;
  const contentHeight = content.height * scale;

  const pillWidth = contentWidth + EDGE_LABEL_PADDING * 2;
  const pillHeight = contentHeight + EDGE_LABEL_PADDING;
  const background = props.backgroundColor;
  const hasPill =
    background !== undefined && background !== 'transparent' && background !== 'none';

  return (
    <g>
      {hasPill ? (
        <rect
          x={centerX - pillWidth / 2}
          y={centerY - pillHeight / 2}
          width={pillWidth}
          height={pillHeight}
          rx={pillHeight / 2}
          ry={pillHeight / 2}
          fill={background}
        />
      ) : null}
      <text
        x={centerX}
        y={baselineYForVisualCenter(centerY, fontSize, 'edge')}
        textAnchor="middle"
        fontFamily={resolveSvgFontFamily(props.fontFamily)}
        fontSize={fontSize}
        fontWeight={props.titleBold ? 700 : 400}
        fill={props.textColor ?? LOOK.text.standaloneLabel}
      >
        {text}
      </text>
    </g>
  );
}
