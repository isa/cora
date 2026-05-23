import {
  BugIcon,
  ErrorIcon,
  StopIcon,
  WarningIcon,
  type SvgIconComponent,
} from '../icons.js';
import type { IssueIconType, IssueNodeProps as BaseIssueNodeProps } from '../types.js';
import { CatalogFrame, CatalogIconSlot, CatalogText, resolvedCatalogFrame } from './shared.js';

export interface IssueNodeProps extends BaseIssueNodeProps {
  x?: number;
  y?: number;
}

const ISSUE_ICONS: Record<IssueIconType, SvgIconComponent> = {
  bug: BugIcon,
  warning: WarningIcon,
  error: ErrorIcon,
  stop: StopIcon,
};

export function IssueNode(props: IssueNodeProps) {
  const frame = resolvedCatalogFrame(props);
  const iconSize = Math.min(18, frame.height * 0.42);
  const iconColor = props.iconColor ?? frame.textColor;
  const iconX = frame.x + 10;
  const labelX = iconX + iconSize + 8;

  return (
    <CatalogFrame {...props}>
      <CatalogIconSlot
        icon={ISSUE_ICONS[props.icon]}
        x={iconX}
        y={frame.y + (frame.height - iconSize) / 2}
        size={iconSize}
        color={iconColor}
        title={props.icon}
      />
      <CatalogText
        x={labelX}
        y={frame.y}
        width={Math.max(1, frame.x + frame.width - labelX - 6)}
        height={frame.height}
        text={frame.text}
        subtitle={frame.subtitle}
        color={frame.textColor}
        subtitleColor={frame.subtitleColor}
        fontSize={frame.titleFontSize}
        subtitleFontSize={frame.subtitleFontSize}
        paddingX={2}
      />
    </CatalogFrame>
  );
}
