import type { BoxStyleProps } from '../types.js';
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
  'M5 23V1h14v22zm2-5v3h10v-3zm5 2.5q.425 0 .713-.288T13 19.5t-.288-.712T12 18.5t-.712.288T11 19.5t.288.713t.712.287M7 16h10V6H7zM7 4h10V3H7zm0 14v3zM7 4V3z';

export function AppNode(props: AppNodeProps) {
  const frame = resolvedCatalogFrame({
    fallbackSize: { width: 96, height: 128 },
    ...props,
  });
  const hasLabel = Boolean(frame.text || frame.subtitle);
  const labelHeight = hasLabel ? Math.min(28, frame.height * 0.18) : 0;
  const artHeight = frame.height - labelHeight;
  const scale = Math.min(frame.width / ARTBOARD, artHeight / ARTBOARD);
  const artWidth = ARTBOARD * scale;
  const scaledArtHeight = ARTBOARD * scale;
  const offsetX = frame.x + (frame.width - artWidth) / 2;
  const offsetY = frame.y + (artHeight - scaledArtHeight) / 2;
  const chassisColor = frame.borderColor ?? '#10b981';
  const screenFill = frame.backgroundColor;

  return (
    <g>
      <CatalogShadow
        x={offsetX + 5 * scale}
        y={offsetY + 1 * scale}
        width={14 * scale}
        height={22 * scale}
        radius={2 * scale}
        fill={screenFill}
        shadow={frame.shadow}
        shadowColor={frame.shadowColor}
      />
      <g transform={`translate(${offsetX}, ${offsetY}) scale(${scale})`}>
        <path d={PHONE_IPHONE_PATH} fill={chassisColor} />
        <rect x={7} y={6} width={10} height={10} fill={screenFill} />
      </g>
      <CatalogText
        x={frame.x}
        y={frame.y + frame.height - labelHeight}
        width={frame.width}
        height={labelHeight}
        text={frame.text}
        subtitle={frame.subtitle}
        color={frame.textColor}
        subtitleColor={frame.subtitleColor}
        fontSize={frame.titleFontSize}
        subtitleFontSize={frame.subtitleFontSize}
      />
    </g>
  );
}
