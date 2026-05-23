import type { SvgIconComponent } from '../icons.js';
import type { NodeComponentProps, NodeShadow } from '../types.js';
import {
  CatalogFrame,
  CatalogIconSlot,
  CatalogText,
  NodeLabel,
  resolvedCatalogFrame,
  ShapeShadow,
  strokeWidth,
} from './shared.js';

export interface CatalogBoxNodeProps {
  x?: number;
  y?: number;
  backgroundColor?: string;
  radius?: number;
  borderStyle?: 'none' | 'solid' | 'dashed' | 'dotted';
  borderColor?: string;
  borderWidth?: number;
  title?: string;
  subtitle?: string;
  text?: string;
  textColor?: string;
  subtitleColor?: string;
  titleFontSize?: number;
  subtitleFontSize?: number;
  shadow?: NodeShadow;
  size?: import('../types.js').ComponentSize;
  icon?: SvgIconComponent;
  iconColor?: string;
}

type BoxNodeProps = NodeComponentProps | CatalogBoxNodeProps;

function isLayoutBoxNodeProps(props: BoxNodeProps): props is NodeComponentProps {
  return 'node' in props && 'theme' in props;
}

function LayoutBoxNode({ node, theme }: NodeComponentProps) {
  const style = node.resolvedStyle ?? theme.shapes.box!;
  const sw = strokeWidth(style);

  const renderShape = (offsetX: number, offsetY: number, paint: string, stroke?: string) => (
    <rect
      x={node.x + offsetX}
      y={node.y + offsetY}
      width={node.measuredWidth}
      height={node.measuredHeight}
      fill={paint}
      stroke={stroke}
      strokeWidth={stroke ? sw : undefined}
    />
  );

  return (
    <g>
      <ShapeShadow
        theme={theme}
        hasShadow={Boolean(style.shadow)}
        renderShape={(ox, oy) => renderShape(ox, oy, style.shadow!)}
      />
      {renderShape(0, 0, style.fill, style.stroke)}
      <NodeLabel node={node} theme={theme} />
    </g>
  );
}

export function BoxNode(props: BoxNodeProps) {
  if (isLayoutBoxNodeProps(props)) {
    return <LayoutBoxNode {...props} />;
  }

  const frame = resolvedCatalogFrame(props);
  const iconSize = Math.min(20, frame.height * 0.42);
  const iconX = frame.x + 12;
  const hasIcon = Boolean(props.icon);
  const labelX = hasIcon ? frame.x + iconSize + 16 : frame.x;
  const labelWidth = hasIcon ? frame.width - iconSize - 20 : frame.width;

  return (
    <CatalogFrame {...props}>
      {props.icon ? (
        <CatalogIconSlot
          icon={props.icon}
          x={iconX}
          y={frame.y + (frame.height - iconSize) / 2}
          size={iconSize}
          color={props.iconColor ?? frame.textColor}
        />
      ) : null}
      <CatalogText
        x={labelX}
        y={frame.y}
        width={labelWidth}
        height={frame.height}
        text={frame.text}
        subtitle={frame.subtitle}
        color={frame.textColor}
        subtitleColor={frame.subtitleColor}
        fontSize={frame.titleFontSize}
        subtitleFontSize={frame.subtitleFontSize}
      />
    </CatalogFrame>
  );
}
