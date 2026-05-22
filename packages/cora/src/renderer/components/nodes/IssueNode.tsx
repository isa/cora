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
  const iconSize = Math.min(22, frame.height * 0.45);
  const iconColor = props.iconColor ?? frame.textColor;
  const labelX = frame.x + iconSize + 18;

  return (
    <CatalogFrame {...props}>
      <CatalogIconSlot
        icon={ISSUE_ICONS[props.icon]}
        x={frame.x + 12}
        y={frame.y + (frame.height - iconSize) / 2}
        size={iconSize}
        color={iconColor}
        title={props.icon}
      />
      <CatalogText
        x={labelX}
        y={frame.y}
        width={frame.width - iconSize - 24}
        height={frame.height}
        text={frame.text}
        color={frame.textColor}
      />
    </CatalogFrame>
  );
}
