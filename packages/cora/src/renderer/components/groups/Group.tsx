import { escapeXml } from '../../utils.js';
import { resolveSvgFontFamily } from '../../themes/diagramFonts.js';
import type { GroupComponentProps, GroupStyleProps } from '../types.js';

function stringProp(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function numberProp(value: unknown): number | undefined {
  return typeof value === 'number' ? value : undefined;
}

export function Group({
  group,
  theme,
  fillColor,
  backgroundColor,
  labelColor,
  labelSize,
  titleColor,
  titleSize,
  fontFamily,
  labelFontFamily,
}: GroupComponentProps & GroupStyleProps) {
  const style = theme.shapes.group!;
  const groupStyle = group.style ?? {};
  const labelY = group.y - 8;
  const resolvedFill =
    backgroundColor ??
    fillColor ??
    stringProp(groupStyle.backgroundColor) ??
    stringProp(groupStyle.fillColor) ??
    stringProp(groupStyle.fill) ??
    style.fill;
  const resolvedLabelColor =
    titleColor ??
    labelColor ??
    stringProp(groupStyle.titleColor) ??
    stringProp(groupStyle.labelColor) ??
    theme.nodeLabel.fill;
  const resolvedLabelSize =
    titleSize ??
    labelSize ??
    numberProp(groupStyle.titleSize) ??
    numberProp(groupStyle.labelSize) ??
    theme.nodeLabel.fontSize;
  const resolvedFontFamily = resolveSvgFontFamily(
    stringProp(groupStyle.fontFamily) ??
      stringProp(groupStyle.labelFontFamily) ??
      (typeof fontFamily === 'string' ? fontFamily : undefined) ??
      (typeof labelFontFamily === 'string' ? labelFontFamily : undefined),
  );

  return (
    <g>
      <rect
        x={group.x}
        y={group.y}
        width={group.width}
        height={group.height}
        fill={resolvedFill}
        stroke={style.stroke}
        strokeWidth={style.strokeWidth ?? 1.5}
        strokeDasharray={style.strokeDasharray}
      />
      <text
        x={group.x + 8}
        y={labelY}
        fontFamily={resolvedFontFamily}
        fontSize={resolvedLabelSize}
        fontWeight={theme.nodeLabel.fontWeight}
        fill={resolvedLabelColor}
      >
        {escapeXml(group.label)}
      </text>
    </g>
  );
}
