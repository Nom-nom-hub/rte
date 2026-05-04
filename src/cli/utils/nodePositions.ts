export interface NodePosition {
  nodeId: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export function extractNodePositions(tree: any): NodePosition[] {
  const positions: NodePosition[] = [];
  collectPositions(tree, positions, 0);
  return positions;
}

function collectPositions(node: any, positions: NodePosition[], depth: number): void {
  if (!node) return;

  const layout = node.layout;
  if (layout) {
    positions.push({
      nodeId: node.internal?.id || `node-${depth}`,
      label: getNodeLabel(node),
      x: Math.round(layout.x || 0),
      y: Math.round(layout.y || 0),
      width: Math.round(layout.width || 0),
      height: Math.round(layout.height || 0),
    });
  }

  if (node.children) {
    for (const child of node.children) {
      collectPositions(child, positions, depth + 1);
    }
  }
}

function getNodeLabel(node: any): string {
  if (!node) return 'unknown';
  const type = node.type || 'node';
  if (node.props?.label) return `${type}: "${node.props.label}"`;
  if (node.props?.children) return `${type}: ${String(node.props.children).substring(0, 20)}`;
  return type;
}

export function getHighlightPositions(
  rootCauseNodeId: string | null,
  impactedNodeIds: string[],
  nodePositions: NodePosition[]
): { rootCause: Array<{ x: number; y: number }>; impacted: Array<{ x: number; y: number }> } {
  const rootCause: Array<{ x: number; y: number }> = [];
  const impacted: Array<{ x: number; y: number }> = [];

  for (const pos of nodePositions) {
    if (rootCauseNodeId && pos.nodeId === rootCauseNodeId) {
      for (let y = pos.y; y < pos.y + pos.height; y++) {
        for (let x = pos.x; x < pos.x + pos.width; x++) {
          rootCause.push({ x, y });
        }
      }
    }

    if (impactedNodeIds.includes(pos.nodeId)) {
      for (let y = pos.y; y < pos.y + pos.height; y++) {
        for (let x = pos.x; x < pos.x + pos.width; x++) {
          impacted.push({ x, y });
        }
      }
    }
  }

  return { rootCause, impacted };
}