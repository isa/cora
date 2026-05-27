import type { DocumentNodeProps as BaseDocumentNodeProps } from '../types.js';
import { resolveDocumentComponentSize } from '../styles.js';
import { CatalogShadow, CatalogText, resolvedCatalogFrame } from './shared.js';

export interface DocumentNodeProps extends BaseDocumentNodeProps {
  x?: number;
  y?: number;
}

const ARTBOARD = 24;

export function DocumentNode(props: DocumentNodeProps) {
  const resolvedSize = resolveDocumentComponentSize(props.size, { width: 192, height: 256 });
  const frame = resolvedCatalogFrame({
    ...props,
    size: resolvedSize,
  });
  const ratio = frame.width / 192;

  const hasLabel = Boolean(frame.text || frame.subtitle);
  const titleFontSize = (frame.titleFontSize ?? 12) * ratio;
  const subtitleFontSize = (frame.subtitleFontSize ?? Math.max(8, (frame.titleFontSize ?? 12) - 2)) * ratio;
  const titleLines = frame.text ? String(frame.text).split(/\r?\n/) : [];
  const subtitleLines = frame.subtitle ? String(frame.subtitle).split(/\r?\n/) : [];
  const textHeight = hasLabel
    ? titleLines.length * titleFontSize * 1.25 +
      (subtitleLines.length > 0 ? 3 * ratio + subtitleLines.length * subtitleFontSize * 1.25 : 0)
    : 0;
  const labelGap = (hasLabel ? 8 : 0) * ratio;
  const topPadding = 12 * ratio;
  const bottomPadding = (hasLabel ? 8 : 12) * ratio;

  const scale = 6 * ratio;
  const artWidth = ARTBOARD * scale;
  const scaledArtHeight = ARTBOARD * scale;

  const offsetX = frame.x + (frame.width - artWidth) / 2;
  const offsetY = frame.y + topPadding + (frame.height - scaledArtHeight - textHeight - labelGap - topPadding - bottomPadding) / 2;

  const textY = frame.y + frame.height - textHeight - bottomPadding;
  const remainingTextHeight = Math.max(textHeight, frame.y + frame.height - textY - bottomPadding);
  const pageFill = frame.backgroundColor ?? '#ffffff';
  const lineColor = props.iconColor ?? '#334155';

  return (
    <g>
      <CatalogShadow
        x={offsetX + 4 * scale}
        y={offsetY + 2 * scale}
        width={16 * scale}
        height={20 * scale}
        radius={3 * scale}
        fill={pageFill}
        shadow={frame.shadow}
        shadowColor={frame.shadowColor}
      />
      <g transform={`translate(${offsetX}, ${offsetY}) scale(${scale})`}>
        <path
          fill={pageFill}
          stroke={lineColor}
          strokeWidth="1.5"
          strokeLinejoin="round"
          d="M7 2.75h8.002c.385 0 .748.18.982.486l2.998 3.968c.174.23.268.51.268.798V19A2.25 2.25 0 0 1 17 21.25H7A2.25 2.25 0 0 1 4.75 19V5A2.25 2.25 0 0 1 7 2.75Z"
        />
        <path
          fill="none"
          stroke={lineColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M14.75 3v5.147c0 .414.336.75.75.75h3.55M9 13h6M9 17h6"
        />
      </g>
      <CatalogText
        x={frame.x}
        y={textY}
        width={frame.width}
        height={remainingTextHeight}
        text={frame.text}
        subtitle={frame.subtitle}
        color={frame.textColor}
        subtitleColor={frame.subtitleColor}
        fontSize={frame.titleFontSize ?? 12}
        subtitleFontSize={frame.subtitleFontSize}
      />
    </g>
  );
}
