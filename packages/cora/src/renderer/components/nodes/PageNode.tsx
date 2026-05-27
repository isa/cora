import type { PageNodeProps as BasePageNodeProps } from '../types.js';
import { resolvePageComponentSize } from '../styles.js';
import { CatalogFrame, CatalogText, resolvedCatalogFrame } from './shared.js';

export interface PageNodeProps extends BasePageNodeProps {
  x?: number;
  y?: number;
}

const ARTBOARD = 24;
const DOCUMENT_PATH =
  'M4 4a2 2 0 0 1 2-2h8a1 1 0 0 1 .707.293l5 5A1 1 0 0 1 20 8v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zm13.586 4L14 4.414V8zM12 4H6v16h12V10h-5a1 1 0 0 1-1-1zm-4 9a1 1 0 0 1 1-1h6a1 1 0 1 1 0 2H9a1 1 0 0 1-1-1m0 4a1 1 0 0 1 1-1h6a1 1 0 1 1 0 2H9a1 1 0 0 1-1-1';

export function PageNode(props: PageNodeProps) {
  const resolvedSize = resolvePageComponentSize(props.size, { width: 192, height: 256 });
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

  const scale = 6.0 * ratio;
  const artWidth = ARTBOARD * scale;
  const scaledArtHeight = ARTBOARD * scale;

  const offsetX = frame.x + (frame.width - artWidth) / 2;
  const offsetY = frame.y + topPadding + (frame.height - scaledArtHeight - textHeight - labelGap - topPadding - bottomPadding) / 2;

  const textY = frame.y + frame.height - textHeight - bottomPadding;
  const remainingTextHeight = Math.max(textHeight, frame.y + frame.height - textY - bottomPadding);

  const fill = props.iconColor ?? frame.borderColor ?? '#0ea5e9';

  return (
    <CatalogFrame {...props} size={props.size ?? 'lg'}>
      <g transform={`translate(${offsetX}, ${offsetY}) scale(${scale})`}>
        <path d={DOCUMENT_PATH} fill={fill} />
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
    </CatalogFrame>
  );
}

