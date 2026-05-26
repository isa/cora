import type { DiagramComponent, LayoutedDiagram, LayoutedNode, ThemeShapeStyle } from '../layout-ir.js';
import {
  AppNode,
  EdgeLabel,
  Group,
  IconNode,
  LabelIconNode,
  LabelNode,
  Line,
  LineMarkerDefs,
  PageNode,
  WebsiteNode,
} from './components/index.js';
import { BoxNode } from './components/nodes/BoxNode.js';
import { resolveIcon } from './iconPacks/resolveIcon.js';
import {
  edgeBridgeMaskPathData,
  edgeLineMarkerPoints,
  edgeLinePathData,
} from './components/edges/edgePath.js';
import { computeViewBox } from './viewBox.js';
import { catalogDefaultProps } from './themes/componentDefaults.js';

export interface DiagramProps {
  diagram: LayoutedDiagram;
}

function renderNode(node: LayoutedNode, diagram: LayoutedDiagram) {
  const component = node.component ?? 'box';
  const catalogProps = nodeCatalogProps(
    node,
    node.resolvedStyle ?? diagram.theme.shapes[component] ?? diagram.theme.shapes.box!,
    component as DiagramComponent
  );

  switch (component) {
    case 'label':
      return <LabelNode key={node.id} {...catalogProps} backgroundColor="transparent" borderStyle="none" />;
    case 'icon':
      return (
        <IconNode
          key={node.id}
          x={node.x}
          y={node.y}
          size={{ width: node.measuredWidth, height: node.measuredHeight }}
          iconColor={catalogProps.textColor}
          textColor={catalogProps.textColor}
          subtitleColor={catalogProps.subtitleColor}
          titleFontSize={catalogProps.titleFontSize}
          subtitleFontSize={catalogProps.subtitleFontSize}
          icon={resolveIcon(node.provider, node.service)}
          title={node.label}
          subtitle={
            typeof node.style?.subtitle === 'string' ? node.style.subtitle : undefined
          }
        />
      );
    case 'labelIcon':
      return <LabelIconNode key={node.id} {...catalogProps} icon={resolveIcon(node.provider, node.service)} />;
    case 'website':
      return <WebsiteNode key={node.id} {...catalogProps} />;
    case 'page':
      return <PageNode key={node.id} {...catalogProps} type="content" />;
    case 'app':
      return <AppNode key={node.id} {...catalogProps} />;
    case 'box':
    default:
      return <BoxNode key={node.id} node={node} theme={diagram.theme} />;
  }
}

function borderStyleFor(style: ThemeShapeStyle): 'none' | 'solid' | 'dashed' | 'dotted' {
  if (style.stroke === 'none' || style.strokeWidth === 0) {
    return 'none';
  }
  if (style.strokeDasharray) {
    return 'dashed';
  }
  return 'solid';
}

function nodeCatalogProps(
  node: LayoutedNode,
  style: ThemeShapeStyle,
  component: DiagramComponent
) {
  const defaults = catalogDefaultProps(component);
  return {
    x: node.x,
    y: node.y,
    size: { width: node.measuredWidth, height: node.measuredHeight },
    backgroundColor: style.fill,
    borderColor: style.stroke,
    borderWidth: style.strokeWidth ?? defaults.borderWidth,
    borderStyle: borderStyleFor(style),
    text: node.label,
    textColor: style.labelFill ?? defaults.textColor,
    subtitleColor: defaults.subtitleColor,
    skeletonColor:
      typeof node.style?.skeletonColor === 'string'
        ? node.style.skeletonColor
        : typeof node.style?.subtitleColor === 'string'
          ? node.style.subtitleColor
          : undefined,
    radius: defaults.radius,
    titleFontSize: defaults.titleFontSize,
    subtitleFontSize: defaults.subtitleFontSize,
    shadow: style.shadow ? ('cast' as const) : ('none' as const),
    shadowColor: style.shadow,
  };
}

export function Diagram({ diagram }: DiagramProps) {
  const viewBox = computeViewBox(diagram);
  const [vx, vy, vw, vh] = viewBox.split(' ').map(Number);

  return (
    <svg viewBox={viewBox}>
      <defs>
        <filter
          id="cora-shadow-blur"
          x="-50%"
          y="-50%"
          width="200%"
          height="200%"
      >
          <feGaussianBlur stdDeviation={diagram.theme.shadowBlur} />
        </filter>
        <LineMarkerDefs color={diagram.theme.edge.stroke} />
      </defs>
      <rect x={vx} y={vy} width={vw} height={vh} fill={diagram.theme.background} />
      <g id="groups">
        {(diagram.groups ?? []).map((group) => (
          <Group key={group.id} group={group} theme={diagram.theme} />
        ))}
      </g>
      <g id="nodes">
        {diagram.nodes.map((node) => renderNode(node, diagram))}
      </g>
      <g id="edges">
        {diagram.edges.map((edge) => (
          <Line
            key={`${edge.from}-${edge.to}-${edge.label ?? ''}`}
            points={edgeLineMarkerPoints(edge)}
            pathData={edgeLinePathData(edge, { trimForMarkers: true })}
            strokeColor={diagram.theme.edge.stroke}
            strokeWidth={diagram.theme.edge.strokeWidth}
          />
        ))}
        {diagram.edges.map((edge) => (
          <Line
            key={`markers-${edge.from}-${edge.to}-${edge.label ?? ''}`}
            points={edgeLineMarkerPoints(edge)}
            strokeColor="transparent"
            strokeWidth={0.001}
            startMarker={edge.startMarker ?? 'none'}
            endMarker={edge.endMarker ?? 'arrow'}
          />
        ))}
      </g>
      <g id="edge-bridge-masks">
        {diagram.edges.map((edge) => {
          const bridgeMaskPathData = edgeBridgeMaskPathData(edge);
          return bridgeMaskPathData ? (
            <Line
              key={`bridge-mask-${edge.from}-${edge.to}-${edge.label ?? ''}`}
              points={edgeLineMarkerPoints(edge)}
              pathData={bridgeMaskPathData}
              strokeColor={diagram.theme.background}
              strokeWidth={diagram.theme.edge.strokeWidth + 3}
            />
          ) : null;
        })}
      </g>
      <g id="edge-bridges">
        {diagram.edges.map((edge) => {
          const bridgePathData = edgeBridgeMaskPathData(edge);
          return bridgePathData ? (
            <Line
              key={`bridge-${edge.from}-${edge.to}-${edge.label ?? ''}`}
              points={edgeLineMarkerPoints(edge)}
              pathData={bridgePathData}
              strokeColor={diagram.theme.edge.stroke}
              strokeWidth={diagram.theme.edge.strokeWidth}
            />
          ) : null;
        })}
      </g>
      <g id="edge-labels">
        {diagram.edges.map((edge) => (
          <EdgeLabel
            key={`label-${edge.from}-${edge.to}-${edge.label ?? ''}`}
            edge={edge}
            theme={diagram.theme}
          />
        ))}
      </g>
    </svg>
  );
}
