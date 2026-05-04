import chalk from 'chalk';

interface TreeInspectorState {
  selectedIndex: number;
  path: number[];
  totalVisible: number;
}

export class TreeInspector {
  private state: TreeInspectorState = {
    selectedIndex: 0,
    path: [],
    totalVisible: 0,
  };

  handleInput(data: string, uiState: { selectedTreePath: number[]; expandedNodes: Set<string> }): void {
    switch (data) {
      case '\x1b[A':
        this.moveUp(uiState);
        break;
      case '\x1b[B':
        this.moveDown(uiState);
        break;
      case '\r':
      case '\n':
        this.toggleExpand(uiState);
        break;
    }
  }

  private moveUp(uiState: { selectedTreePath: number[]; expandedNodes: Set<string> }): void {
    if (this.state.selectedIndex > 0) {
      this.state.selectedIndex--;
      this.updatePathFromIndex(uiState);
    }
  }

  private moveDown(uiState: { selectedTreePath: number[]; expandedNodes: Set<string> }): void {
    if (this.state.selectedIndex < this.state.totalVisible - 1) {
      this.state.selectedIndex++;
      this.updatePathFromIndex(uiState);
    }
  }

  private updatePathFromIndex(uiState: { selectedTreePath: number[]; expandedNodes: Set<string> }): void {
    uiState.selectedTreePath = [this.state.selectedIndex];
  }

  private toggleExpand(uiState: { selectedTreePath: number[]; expandedNodes: Set<string> }): void {
    const pathKey = uiState.selectedTreePath.join('-');
    if (uiState.expandedNodes.has(pathKey)) {
      uiState.expandedNodes.delete(pathKey);
    } else {
      uiState.expandedNodes.add(pathKey);
    }
  }

  getSelectedPath(): number[] {
    return [this.state.selectedIndex];
  }

  getSelectedNode(tree: any, path: number[]): any {
    let current = tree;
    for (const idx of path) {
      if (!current || !current.children) return null;
      current = current.children[idx];
    }
    return current;
  }

  getNodeId(path: number[]): string {
    return `node-${path[0] || 0}`;
  }

  renderTree(
    tree: any,
    expandedNodes: Set<string>,
    selectedPath: number[],
    depth: number,
    maxLines: number
  ): string[] {
    const lines: string[][] = [];
    this.state.totalVisible = 0;

    this.renderNodeRecursive(tree, expandedNodes, selectedPath, depth, lines, 0, maxLines);

    return lines.slice(0, maxLines).map(l => l.join(''));
  }

  private renderNodeRecursive(
    node: any,
    expandedNodes: Set<string>,
    selectedPath: number[],
    depth: number,
    lines: string[][],
    currentIndex: number,
    maxLines: number
  ): number {
    if (currentIndex >= maxLines) return currentIndex;

    const isSelected = this.state.selectedIndex === currentIndex;
    const prefix = '  '.repeat(depth);
    const hasChildren = node.children && node.children.length > 0;
    const pathKey = [...Array(depth).keys()].map(i => selectedPath[i] || 0).join('-');
    const isExpanded = expandedNodes.has(pathKey) || expandedNodes.has(String(currentIndex));

    const icon = hasChildren ? (isExpanded ? '▼' : '▶') : ' ';
    const typeStr = node.type || 'unknown';
    const label = node.props?.label || node.props?.children || typeStr;

    let line = prefix + icon + ' ';
    if (isSelected) {
      line += chalk.bgBlue.white(typeStr) + ' ' + chalk.white(String(label).substring(0, 20));
    } else {
      line += chalk.gray(typeStr) + ' ' + chalk.white(String(label).substring(0, 20));
    }

    lines.push([line]);
    this.state.totalVisible++;
    currentIndex++;

    if (hasChildren && isExpanded) {
      for (let i = 0; i < node.children.length; i++) {
        if (currentIndex >= maxLines) break;
        currentIndex = this.renderNodeRecursive(
          node.children[i],
          expandedNodes,
          selectedPath,
          depth + 1,
          lines,
          currentIndex,
          maxLines
        );
      }
    }

    return currentIndex;
  }
}