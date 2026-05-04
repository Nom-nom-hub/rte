import chalk from 'chalk';
import type { UpdateReason } from '../../deterministic/causality.js';

export interface DebugSummary {
  frame: number;
  rootCause: RootCauseAnalysis | null;
  impact: ImpactAnalysis;
}

export interface RootCauseAnalysis {
  nodeId: string;
  nodeLabel: string;
  reason: string;
  details: string;
  priority: number;
}

export interface ImpactAnalysis {
  affectedNodes: number;
  affectedNodeIds: string[];
  nodeDetails: Array<{ id: string; label: string; changeType: string }>;
}

export interface DependencyNode {
  nodeId: string;
  parentId: string | null;
  depth: number;
  label: string;
}

interface PriorityNode {
  id: string;
  label: string;
  reason: string;
  priority: number;
  depth: number;
  childCount: number;
  changeType: 'state' | 'props' | 'parent' | 'mount' | 'unknown';
}

export function analyzeDivergence(
  frameIndex: number,
  frameA: any,
  frameB: any,
  treeDiff: { addedNodes: string[]; removedNodes: string[]; updatedNodes: string[] }
): DebugSummary {
  const updatesA = frameA?.updates || [];
  const updatesB = frameB?.updates || [];

  const allUpdates = [...updatesA, ...updatesB];
  const uniqueNodeIds = [...new Set(allUpdates.map(u => u.nodeId))];

  const priorityNodes = buildPriorityList(uniqueNodeIds, allUpdates, frameB?.tree);

  const rootCause = findRootCause(priorityNodes, allUpdates);

  const affectedNodes = traceDependencies(rootCause, frameB?.tree);

  return {
    frame: frameIndex,
    rootCause: rootCause ? {
      nodeId: rootCause.id,
      nodeLabel: rootCause.label,
      reason: rootCause.reason,
      details: formatReasonDetails(rootCause),
      priority: rootCause.priority,
    } : null,
    impact: {
      affectedNodes: affectedNodes.length,
      affectedNodeIds: affectedNodes.map(n => n.nodeId),
      nodeDetails: affectedNodes.map(n => ({
        id: n.nodeId,
        label: n.label,
        changeType: getChangeType(n, allUpdates),
      })),
    },
  };
}

function buildPriorityList(nodeIds: string[], updates: UpdateReason[], tree: any): PriorityNode[] {
  const nodes: PriorityNode[] = [];

  for (const nodeId of nodeIds) {
    const nodeUpdates = updates.filter(u => u.nodeId === nodeId);
    const lastUpdate = nodeUpdates[nodeUpdates.length - 1];

    const nodeInfo = findNodeInTree(tree, nodeId);
    const childCount = countChildren(nodeInfo?.node);

    let changeType: 'state' | 'props' | 'parent' | 'mount' | 'unknown' = 'unknown';
    if (lastUpdate) {
      if (lastUpdate.reason === 'state') changeType = 'state';
      else if (lastUpdate.reason === 'props') changeType = 'props';
      else if (lastUpdate.reason === 'parent') changeType = 'parent';
      else if (lastUpdate.reason === 'mount') changeType = 'mount';
    }

    const reasonScore = changeType === 'state' ? 100 : changeType === 'props' ? 50 : changeType === 'parent' ? 30 : 10;
    const childScore = childCount * 5;
    const priority = reasonScore + childScore;

    nodes.push({
      id: nodeId,
      label: nodeInfo?.label || nodeId,
      reason: lastUpdate?.reason || 'unknown',
      priority,
      depth: nodeInfo?.depth || 0,
      childCount,
      changeType,
    });
  }

  nodes.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return a.depth - b.depth;
  });

  return nodes;
}

function findRootCause(priorityNodes: PriorityNode[], updates: UpdateReason[]): PriorityNode | null {
  if (priorityNodes.length === 0) return null;

  const stateChanges = priorityNodes.filter(n => n.changeType === 'state');
  if (stateChanges.length > 0) return stateChanges[0];

  const propsChanges = priorityNodes.filter(n => n.changeType === 'props');
  if (propsChanges.length > 0) return propsChanges[0];

  return priorityNodes[0] || null;
}

function traceDependencies(rootCause: PriorityNode | null, tree: any): DependencyNode[] {
  if (!rootCause || !tree) return [];

  const affected: DependencyNode[] = [];
  const rootInfo = findNodeInTree(tree, rootCause.id);

  if (rootInfo?.node) {
    collectChildren(rootInfo.node, rootCause.id, rootInfo.depth, affected);
  }

  return affected;
}

function collectChildren(node: any, parentId: string, depth: number, affected: DependencyNode[]): void {
  if (!node) return;

  const nodeId = node.internal?.id || `node-${Math.random().toString(36).substr(2, 9)}`;

  affected.push({
    nodeId,
    parentId,
    depth,
    label: getNodeLabel(node),
  });

  if (node.children) {
    for (const child of node.children) {
      collectChildren(child, nodeId, depth + 1, affected);
    }
  }
}

function findNodeInTree(tree: any, nodeId: string): { node: any; label: string; depth: number } | null {
  return findNodeRecursive(tree, nodeId, 0);
}

function findNodeRecursive(node: any, nodeId: string, depth: number): { node: any; label: string; depth: number } | null {
  if (!node) return null;

  const currentId = node.internal?.id || `node-${depth}`;

  if (currentId === nodeId) {
    return { node, label: getNodeLabel(node), depth };
  }

  if (node.children) {
    for (const child of node.children) {
      const result = findNodeRecursive(child, nodeId, depth + 1);
      if (result) return result;
    }
  }

  return null;
}

function countChildren(node: any): number {
  if (!node || !node.children) return 0;
  let count = node.children.length;
  for (const child of node.children) {
    count += countChildren(child);
  }
  return count;
}

function getNodeLabel(node: any): string {
  if (!node) return 'unknown';
  const type = node.type || 'node';
  if (node.props?.label) return `${type}: "${node.props.label}"`;
  if (node.props?.children) return `${type}: ${String(node.props.children).substring(0, 20)}`;
  return type;
}

function getChangeType(node: DependencyNode, updates: UpdateReason[]): string {
  const nodeUpdate = updates.find(u => u.nodeId === node.nodeId);
  return nodeUpdate?.reason || 'unknown';
}

function formatReasonDetails(node: PriorityNode): string {
  switch (node.changeType) {
    case 'state':
      return 'State change detected - likely triggered re-render';
    case 'props':
      return 'Props changed - caused component update';
    case 'parent':
      return 'Parent re-rendered - cascading update';
    case 'mount':
      return 'New node mounted';
    default:
      return 'Unknown change';
  }
}

export function printDebugSummary(summary: DebugSummary, options: { json: boolean; summaryOnly: boolean; visual: boolean }): void {
  if (options.json) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  console.log();
  console.log(chalk.red.bold('═'.repeat(60)));
  console.log(chalk.red.bold('  DEBUG INSIGHTS'));
  console.log(chalk.red.bold('═'.repeat(60)));
  console.log();

  console.log(chalk.white.bold('  Divergence starts at frame ') + chalk.red(String(summary.frame)));
  console.log();

  if (summary.rootCause) {
    console.log(chalk.white('  Root Cause:'));
    console.log(chalk.white('    Node: ') + chalk.red(summary.rootCause.nodeLabel));
    console.log(chalk.white('    Reason: ') + chalk.yellow(summary.rootCause.reason));
    console.log(chalk.white('    Details: ') + chalk.gray(summary.rootCause.details));
    console.log();
  }

  console.log(chalk.white('  Impact:'));
  console.log(chalk.white('    Affected nodes: ') + chalk.red(String(summary.impact.affectedNodes)));
  console.log();

  if (summary.impact.nodeDetails.length > 0 && !options.summaryOnly) {
    console.log(chalk.white('    Affected node breakdown:'));
    for (const detail of summary.impact.nodeDetails.slice(0, 10)) {
      const icon = detail.changeType === 'state' ? '●' : detail.changeType === 'props' ? '○' : '◐';
      const color = detail.changeType === 'state' ? chalk.green : detail.changeType === 'props' ? chalk.yellow : chalk.gray;
      console.log(color(`      ${icon} ${detail.label} (${detail.changeType})`));
    }
    if (summary.impact.nodeDetails.length > 10) {
      console.log(chalk.gray(`      ... and ${summary.impact.nodeDetails.length - 10} more`));
    }
    console.log();
  }
}