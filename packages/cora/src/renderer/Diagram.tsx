import type { LayoutedDiagram, LayoutedNode } from '../layout-ir.js';
import { Arrow } from './edges/Arrow.js';
import { EdgeLabel } from './edges/EdgeLabel.js';
import { Group } from './groups/Group.js';
import {
  BoxNode,
  CloudNode,
  CylinderNode,
  DiamondNode,
  HexagonNode,
  RoundedNode,
} from './nodes/index.js';
import { computeViewBox } from './viewBox.js';

export interface DiagramProps {
  diagram: LayoutedDiagram;
}

function renderNode(node: LayoutedNode, diagram: LayoutedDiagram) {
  const shape = node.shape ?? 'rectangle';
  const props = { node, theme: diagram.theme };

  switch (shape) {
    case 'rounded':
      return <RoundedNode key={node.id} {...props} />;
    case 'cylinder':
      return <CylinderNode key={node.id} {...props} />;
    case 'cloud':
      return <CloudNode key={node.id} {...props} />;
    case 'diamond':
      return <DiamondNode key={node.id} {...props} />;
    case 'hexagon':
      return <HexagonNode key={node.id} {...props} />;
    case 'rectangle':
    default:
      return <BoxNode key={node.id} {...props} />;
  }
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
          <Arrow
            key={`${edge.from}-${edge.to}-${edge.label ?? ''}`}
            edge={edge}
            theme={diagram.theme}
          />
        ))}
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
