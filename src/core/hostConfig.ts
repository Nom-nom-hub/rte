import { Node as InternalNode } from '../tree/node';
import { createNode } from '../tree/createNode';
import { setupYogaNode, computeLayout } from '../layout/yoga';
import { drawToBuffer } from '../renderer/draw';
import { diffFrameBuffers, applyAnsiDiff } from '../renderer/diff';
import { getFrameStore } from '../deterministic/frameStore';
import Yoga from 'yoga-layout-prebuilt';

const TEXT_NODE = 3;
const ELEMENT_NODE = 1;

export class NodeManager {
  private nodeMap = new WeakMap<any, InternalNode>();
  private rootNode: InternalNode | null = null;

  createInstance(type: string, props: any, rootContainer: any, hostContext: any): any {
    let nodeType: 'box' | 'text' = 'box';
    if (type === 'Text') {
      nodeType = 'text';
    }
    const node = createNode(nodeType, props || {});
    if (type !== 'Text') {
      const yogaNode = setupYogaNode(node);
      node.yogaNode = yogaNode;
    }
    return node;
  }

  createTextInstance(text: string, rootContainer: any, hostContext: any): any {
    const node = createNode('text', {});
    node.internal = { textValue: text, isTextNode: true };
    const yogaNode = Yoga.Node.create();
    yogaNode.setWidth('auto');
    node.yogaNode = yogaNode;
    return node;
  }

  appendChild(parent: any, child: any): void {
    if (!parent || !child) return;
    parent.children.push(child);
    child.parent = parent;
    if (parent.yogaNode && child.yogaNode) {
      parent.yogaNode.insertChild(child.yogaNode, parent.yogaNode.getChildCount());
    }
  }

  appendInitialChild(parent: any, child: any): void {
    this.appendChild(parent, child);
  }

  removeChild(parent: any, child: any): void {
    if (!parent || !child) return;
    const index = parent.children.indexOf(child);
    if (index > -1) parent.children.splice(index, 1);
    if (parent.yogaNode && child.yogaNode) {
      parent.yogaNode.removeChild(child.yogaNode);
    }
  }

  insertBefore(parent: any, child: any, beforeChild: any): void {
    if (!parent || !child) return;
    const index = parent.children.indexOf(beforeChild);
    if (index > -1) {
      parent.children.splice(index, 0, child);
      child.parent = parent;
      if (parent.yogaNode && child.yogaNode) {
        parent.yogaNode.insertChild(child.yogaNode, index);
      }
    }
  }

  commitUpdate(node: any, updatePayload: any, oldType: any, newType: any): void {
    if (!node) return;
  }

  commitTextUpdate(node: any, oldText: string, newText: string): void {
    if (!node) return;
    if (!node.internal) node.internal = {};
    node.internal.textValue = newText;
    // Trigger render pipeline after text update
    setTimeout(() => {
      const rootNode = nodeManager.getRootNode();
      if (!rootNode) return;
      const width = process?.stdout?.columns || 80;
      const height = process?.stdout?.rows || 24;
      if (rootNode.yogaNode) {
        rootNode.yogaNode.setWidth(width);
        rootNode.yogaNode.setHeight(height);
        computeLayout(rootNode);
      }
      const buffer = drawToBuffer(rootNode, width, height);
      const tree = JSON.parse(JSON.stringify(rootNode, (k: string, v: any) => {
        if (k === 'yogaNode' || k === 'parent' || k === 'internal') return undefined;
        return v;
      }));
      const frameStore = getFrameStore();
      const previousFrame = frameStore.getLatestFrame();
      const diffs = diffFrameBuffers(previousFrame?.buffer || null, buffer);
      const ansiOutput = applyAnsiDiff(diffs);
      if (process?.stdout && previousFrame !== null && ansiOutput) {
        process.stdout.write(ansiOutput);
      }
    }, 0);
  }

  removeChildFromContainer(container: any, child: any): void {
    this.removeChild(container, child);
  }

  appendChildToContainer(container: any, child: any): void {
    this.appendChild(container, child);
  }

  insertInContainerBefore(container: any, child: any, beforeChild: any): void {
    this.insertBefore(container, child, beforeChild);
  }

  getRootNode(): InternalNode | null {
    return this.rootNode;
  }

  setRootNode(node: InternalNode): void {
    this.rootNode = node;
  }

  getPublicInstance(node: any): any {
    return node;
  }

  prepareForCommit(): any {
    return null;
  }

  finalizeInitialChildren(): boolean {
    return false;
  }

  prepareUpdate(): any {
    return null;
  }

  shouldSetTextContent(): boolean {
    return false;
  }

  clearContainer(container: any): void {
    if (container.children) container.children = [];
  }

  getRootHostContext(): any {
    return null;
  }

  getChildHostContext(parentHostContext: any, type: string, rootContainer: any): any {
    return parentHostContext;
  }
}

export const nodeManager = new NodeManager();
