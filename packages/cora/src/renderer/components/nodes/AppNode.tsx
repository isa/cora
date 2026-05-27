import type { BoxStyleProps } from '../types.js';
import { resolveAppComponentSize } from '../styles.js';
import {
  CatalogShadow,
  CatalogText,
  resolvedCatalogFrame,
} from './shared.js';

export interface AppNodeProps extends BoxStyleProps {
  x?: number;
  y?: number;
}

const ARTBOARD = 24;
const PHONE_IPHONE_PATH =
  'M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75A2.25 2.25 0 0 0 15.75 1.5H13.5M10.5 1.5H13.5M10.5 1.5V3H13.5V1.5M12 21.75V21.75';

export function AppNode(props: AppNodeProps) {
  const resolvedSize = resolveAppComponentSize(props.size, { width: 160, height: 128 });
  const frame = resolvedCatalogFrame({
    ...props,
    size: resolvedSize,
  });
  const ratio = frame.width / 160;

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
  const topPadding = (hasLabel ? 6 : 0) * ratio;
  const bottomPadding = (hasLabel ? 6 : 0) * ratio;

  const scale = 3.875 * ratio;
  const artWidth = ARTBOARD * scale;
  const scaledArtHeight = ARTBOARD * scale;
  const offsetX = frame.x + (frame.width - artWidth) / 2;
  const offsetY = frame.y + topPadding + (frame.height - scaledArtHeight - textHeight - labelGap - topPadding - bottomPadding) / 2;
  const textY = offsetY + 23 * scale + labelGap;
  const remainingTextHeight = Math.max(textHeight, frame.y + frame.height - textY - bottomPadding);
  const chassisColor = frame.borderColor ?? '#000000';
  const screenFill = frame.backgroundColor;

  return (
    <g>
      <CatalogShadow
        x={offsetX + 5.25 * scale}
        y={offsetY + 0.75 * scale}
        width={13.5 * scale}
        height={22.5 * scale}
        radius={3 * scale}
        fill={screenFill}
        shadow={frame.shadow}
        shadowColor={frame.shadowColor}
      />
      <g transform={`translate(${offsetX}, ${offsetY}) scale(${scale})`}>
        <rect x={6} y={1.5} width={12} height={21} rx={2.25} fill={screenFill} />
        <path
          d={PHONE_IPHONE_PATH}
          fill="none"
          stroke={chassisColor}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
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
        fontSize={titleFontSize}
        subtitleFontSize={subtitleFontSize}
      />
    </g>
  );
}
