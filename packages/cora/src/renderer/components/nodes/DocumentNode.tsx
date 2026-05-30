import type { DocumentNodeProps as BaseDocumentNodeProps } from '../types.js';
import { resolveCatalogTextLayout } from '../../../core/catalogTextLayout.js';
import { DOCUMENT_SIZE_PRESETS, ICON_NODE_ART_SIZE, resolveDocumentComponentSize } from '../styles.js';
import { CatalogShadow, CatalogText, resolvedCatalogFrame } from './shared.js';

export interface DocumentNodeProps extends BaseDocumentNodeProps {
  x?: number;
  y?: number;
}

const ARTBOARD = 24;
const DOCUMENT_SHADE_PATH =
  'M5.235 4.058C5 4.941 5 6.177 5 8v8c0 1.823 0 3.058.235 3.942L5 19.924c-.975-.096-1.631-.313-2.121-.803C2 18.243 2 16.828 2 14v-4c0-2.829 0-4.243.879-5.121c.49-.49 1.146-.707 2.121-.803zm13.53 15.884C19 19.058 19 17.822 19 16V8c0-1.823 0-3.059-.235-3.942l.235.018c.975.096 1.631.313 2.121.803C22 5.757 22 7.17 22 9.999v4c0 2.83 0 4.243-.879 5.122c-.49.49-1.146.707-2.121.803z';
const DOCUMENT_PATH =
  'M5.879 2.879C5 3.757 5 5.172 5 8v8c0 2.828 0 4.243.879 5.121C6.757 22 8.172 22 11 22h2c2.828 0 4.243 0 5.121-.879C19 20.243 19 18.828 19 16V8c0-2.828 0-4.243-.879-5.121C17.243 2 15.828 2 13 2h-2c-2.828 0-4.243 0-5.121.879M8.25 17a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 0 1.5H9a.75.75 0 0 1-.75-.75M9 12.25a.75.75 0 0 0 0 1.5h6a.75.75 0 0 0 0-1.5zM8.25 9A.75.75 0 0 1 9 8.25h6a.75.75 0 0 1 0 1.5H9A.75.75 0 0 1 8.25 9';

export function DocumentNode(props: DocumentNodeProps) {
  const resolvedSize = resolveDocumentComponentSize(props.size, DOCUMENT_SIZE_PRESETS.lg);
  const frame = resolvedCatalogFrame({
    ...props,
    size: resolvedSize,
  });
  const ratio = Math.min(
    frame.width / DOCUMENT_SIZE_PRESETS.lg.width,
    frame.height / DOCUMENT_SIZE_PRESETS.lg.height,
  );

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
  const topPadding = 12 * ratio;
  const bottomPadding = (hasLabel ? 8 : 12) * ratio;

  const scale = (ICON_NODE_ART_SIZE / ARTBOARD) * ratio;
  const artWidth = ARTBOARD * scale;
  const scaledArtHeight = ARTBOARD * scale;

  const offsetX = frame.x + (frame.width - artWidth) / 2;
  const offsetY = frame.y + topPadding + (frame.height - scaledArtHeight - textHeight - labelGap - topPadding - bottomPadding) / 2;

  const textY = offsetY + scaledArtHeight + labelGap;
  const iconColor = props.iconColor ?? frame.borderColor ?? '#334155';
  const shadowFill = frame.backgroundColor === 'transparent' ? '#ffffff' : frame.backgroundColor;

  return (
    <g>
      <CatalogShadow
        x={offsetX + 2 * scale}
        y={offsetY + 2 * scale}
        width={20 * scale}
        height={20 * scale}
        radius={4 * scale}
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
        <path d={DOCUMENT_PATH} fillRule="evenodd" clipRule="evenodd" />
        <path d={DOCUMENT_SHADE_PATH} opacity="0.5" />
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
