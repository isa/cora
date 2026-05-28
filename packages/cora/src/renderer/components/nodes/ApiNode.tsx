import type { BoxStyleProps } from '../types.js';
import { API_SIZE_PRESETS, ICON_NODE_ART_SIZE, iconNodeScale, resolveApiComponentSize } from '../styles.js';
import {
  CatalogShadow,
  CatalogText,
  resolvedCatalogFrame,
} from './shared.js';

export interface ApiNodeProps extends BoxStyleProps {
  x?: number;
  y?: number;
  iconColor?: string;
}

const ARTBOARD = 256;
const CUBE_SHADE_PATH = 'M128 129.09V232a8 8 0 0 1-3.84-1l-88-48.16a8 8 0 0 1-4.16-7V80.2a8 8 0 0 1 .7-3.27Z';
const CUBE_PATH = 'm223.68 66.15l-88-48.15a15.88 15.88 0 0 0-15.36 0l-88 48.17a16 16 0 0 0-8.32 14v95.64a16 16 0 0 0 8.32 14l88 48.17a15.88 15.88 0 0 0 15.36 0l88-48.17a16 16 0 0 0 8.32-14V80.18a16 16 0 0 0-8.32-14.03M128 32l80.34 44L128 120L47.66 76ZM40 90l80 43.78v85.79l-80-43.75Zm96 129.57v-85.75L216 90v85.78Z';

export function ApiNode(props: ApiNodeProps) {
  const resolvedSize = resolveApiComponentSize(props.size, API_SIZE_PRESETS.lg);
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
  const shadowX = offsetX + 24 * scale;
  const shadowY = offsetY + 18 * scale;
  const shadowWidth = 208 * scale;
  const shadowHeight = 220 * scale;
  const shadowRadius = 14 * scale;

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
        fill="currentColor"
        aria-label={frame.text}
        role={frame.text ? 'img' : undefined}
      >
        {frame.text ? <title>{frame.text}</title> : null}
        <path d={CUBE_SHADE_PATH} opacity="0.2" />
        <path d={CUBE_PATH} />
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
