import type { BoxStyleProps } from '../types.js';
import { resolveCatalogTextLayout } from '../../../core/catalogTextLayout.js';
import { DATABASE_SIZE_PRESETS, ICON_NODE_ART_SIZE, iconNodeScale, resolveDatabaseComponentSize } from '../styles.js';
import {
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
  const textHeight = hasLabel
    ? resolveCatalogTextLayout({
        text: frame.text,
        subtitle: frame.subtitle,
        width: frame.width,
        fontSize: titleFontSize,
        subtitleFontSize,
      }).totalHeight
    : 0;
  const labelGap = (hasLabel ? 8 : 0) * ratio;
  const topPadding = (hasLabel ? 6 : 0) * ratio;
  const bottomPadding = (hasLabel ? 6 : 0) * ratio;

  const artSize = ICON_NODE_ART_SIZE * ratio;
  const scale = artSize / ARTBOARD;
  const offsetX = frame.x + (frame.width - artSize) / 2;
  const offsetY = frame.y + topPadding + (frame.height - artSize - textHeight - labelGap - topPadding - bottomPadding) / 2;
  const textY = offsetY + artSize + labelGap;
  const iconColor = props.iconColor ?? '#22c55e';

  return (
    <g>
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
        fontFamily={frame.fontFamily}
        fontWeight={frame.titleBold ? 700 : 400}
        subtitleFontWeight={frame.subtitleBold ? 700 : 400}
      />
    </g>
  );
}
