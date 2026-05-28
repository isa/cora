import type { BoxStyleProps } from '../types.js';
import { DATABASE_SIZE_PRESETS, ICON_NODE_ART_SIZE, iconNodeScale, resolveDatabaseComponentSize } from '../styles.js';
import {
  CatalogShadow,
  CatalogText,
  resolvedCatalogFrame,
} from './shared.js';

export interface DatabaseNodeProps extends BoxStyleProps {
  x?: number;
  y?: number;
  iconColor?: string;
}

const ARTBOARD = 24;
const DATABASE_FILL_PATH = 'M5 8a12.04 12.04 0 0 0 14 0v10a14.11 14.11 0 0 1-14 0z';
const DATABASE_SIDE_PATH = 'M5 13v4c0 1.657 3.134 3 7 3s7-1.343 7-3v-4';
const DATABASE_BODY_PATH = 'M5 7v5c0 1.657 3.134 3 7 3s7-1.343 7-3V7';

export function DatabaseNode(props: DatabaseNodeProps) {
  const resolvedSize = resolveDatabaseComponentSize(props.size, DATABASE_SIZE_PRESETS.lg);
  const frame = resolvedCatalogFrame({
    ...props,
    size: resolvedSize,
  });
  const ratio = iconNodeScale(frame);

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

  const artSize = ICON_NODE_ART_SIZE * ratio;
  const scale = artSize / ARTBOARD;
  const offsetX = frame.x + (frame.width - artSize) / 2;
  const offsetY = frame.y + topPadding + (frame.height - artSize - textHeight - labelGap - topPadding - bottomPadding) / 2;
  const textY = offsetY + artSize + labelGap;
  const iconColor = props.iconColor ?? frame.borderColor ?? '#334155';
  const shadowFill = frame.backgroundColor === 'transparent' ? '#ffffff' : frame.backgroundColor;
  const shadowX = offsetX + 5 * scale;
  const shadowY = offsetY + 4 * scale;
  const shadowWidth = 14 * scale;
  const shadowHeight = 16 * scale;
  const shadowRadius = 2 * scale;

  return (
    <g>
      <CatalogShadow
        x={shadowX}
        y={shadowY}
        width={shadowWidth}
        height={shadowHeight}
        radius={shadowRadius}
        fill={shadowFill}
        shadow={frame.shadow}
        shadowColor={frame.shadowColor}
      />
      <g
        transform={`translate(${offsetX}, ${offsetY}) scale(${scale})`}
        color={iconColor}
        fill="none"
        aria-label={frame.text}
        role={frame.text ? 'img' : undefined}
      >
        {frame.text ? <title>{frame.text}</title> : null}
        <path fill="currentColor" fillOpacity="0.25" d={DATABASE_FILL_PATH} />
        <ellipse cx="12" cy="7" stroke="currentColor" strokeWidth="1.2" rx="7" ry="3" />
        <path stroke="currentColor" strokeLinecap="square" strokeWidth="1.2" d={DATABASE_SIDE_PATH} />
        <path stroke="currentColor" strokeWidth="1.2" d={DATABASE_BODY_PATH} />
      </g>
      <CatalogText
        x={frame.x}
        y={textY}
        width={frame.width}
        height={textHeight}
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
