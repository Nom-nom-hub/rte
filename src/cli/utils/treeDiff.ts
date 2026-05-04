interface TreeDiffResult {
  addedNodes: string[];
  removedNodes: string[];
  updatedNodes: string[];
}

export function computeTreeDiff(treeA: any, treeB: any): TreeDiffResult {
  const result: TreeDiffResult = {
    addedNodes: [],
    removedNodes: [],
    updatedNodes: [],
  };

  if (!treeA && treeB) {
    collectNodes(treeB, result.addedNodes);
    return result;
  }

  if (treeA && !treeB) {
    collectNodes(treeA, result.removedNodes);
    return result;
  }

  compareTrees(treeA, treeB, result, []);

  return result;
}

function collectNodes(tree: any, nodes: string[]): void {
  if (!tree) return;

  const label = getNodeLabel(tree);
  if (label) nodes.push(label);

  if (tree.children) {
    for (const child of tree.children) {
      collectNodes(child, nodes);
    }
  }
}

function compareTrees(treeA: any, treeB: any, result: TreeDiffResult, path: string[]): void {
  if (!treeA && treeB) {
    collectNodes(treeB, result.addedNodes);
    return;
  }

  if (treeA && !treeB) {
    collectNodes(treeA, result.removedNodes);
    return;
  }

  if (!treeA || !treeB) return;

  const labelA = getNodeLabel(treeA);
  const labelB = getNodeLabel(treeB);

  if (labelA !== labelB) {
    if (!result.removedNodes.includes(labelA)) {
      result.removedNodes.push(labelA);
    }
    if (!result.addedNodes.includes(labelB)) {
      result.addedNodes.push(labelB);
    }
  } else {
    const propsChanged = havePropsChanged(treeA.props, treeB.props);
    if (propsChanged) {
      result.updatedNodes.push(labelA);
    }
  }

  const childrenA = treeA.children || [];
  const childrenB = treeB.children || [];

  const maxChildren = Math.max(childrenA.length, childrenB.length);

  for (let i = 0; i < maxChildren; i++) {
    const childA = childrenA[i];
    const childB = childrenB[i];
    compareTrees(childA, childB, result, [...path, String(i)]);
  }
}

function getNodeLabel(tree: any): string {
  if (!tree) return '';
  const type = tree.type || 'node';
  if (tree.props?.label) return `${type}: "${tree.props.label}"`;
  if (tree.props?.children) return `${type}: ${String(tree.props.children).substring(0, 20)}`;
  return type;
}

function havePropsChanged(propsA: any, propsB: any): boolean {
  if (!propsA && !propsB) return false;
  if (!propsA || !propsB) return true;

  const keysA = Object.keys(propsA).filter(k => !['children', 'yogaNode', 'internal'].includes(k));
  const keysB = Object.keys(propsB).filter(k => !['children', 'yogaNode', 'internal'].includes(k));

  if (keysA.length !== keysB.length) return true;

  for (const key of keysA) {
    if (propsA[key] !== propsB[key]) return true;
  }

  return false;
}

export function computeBufferDiff(bufferA: any[][], bufferB: any[][]): { changedCells: number; changedPositions: Array<{ x: number; y: number }> } {
  const changedPositions: Array<{ x: number; y: number }> = [];
  let changedCells = 0;

  const rows = Math.max(bufferA?.length || 0, bufferB?.length || 0);
  const cols = Math.max(bufferA?.[0]?.length || 0, bufferB?.[0]?.length || 0);

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const cellA = bufferA?.[y]?.[x];
      const cellB = bufferB?.[y]?.[x];

      if (cellA?.char !== cellB?.char || cellA?.style !== cellB?.style) {
        changedCells++;
        changedPositions.push({ x, y });
      }
    }
  }

  return { changedCells, changedPositions };
}