import ReactReconciler from 'react-reconciler';
import { nodeManager } from './hostConfig';
import { getFrameStore } from '../deterministic/frameStore';
import { getCausalityTracker, shallowDiff } from '../deterministic/causality';
import { computeLayout } from '../layout/yoga';
import { drawToBuffer } from '../renderer/draw';
import { diffFrameBuffers, applyAnsiDiff } from '../renderer/diff';
import { clearScreen, hideCursor } from '../renderer/ansi';
import { hashFrame } from '../deterministic/frameStore';
import { inputManager } from '../input/input';

export { getCausalityTracker } from '../deterministic/causality';

const causalityTracker = getCausalityTracker();
const nodeToProps = new Map<any, any>();

function resetAfterCommit() {
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
  const hash = hashFrame(tree, buffer);

  const updates = causalityTracker.getUpdatesForFrame(causalityTracker.getCurrentFrameIndex());

  const frame = { tree, buffer, hash, updates };
  frameStore.addFrame(frame);

  const diffs = diffFrameBuffers(previousFrame?.buffer || null, buffer);
  const ansiOutput = applyAnsiDiff(diffs);

  if (process && process.stdout) {
    if (previousFrame === null) {
      process.stdout.write(clearScreen());
      process.stdout.write(hideCursor());
    }
    if (ansiOutput) {
      process.stdout.write(ansiOutput);
    }
  }

  causalityTracker.nextFrame();
}

function trackCreateInstance(type: string, props: any, rootContainer: any, hostContext: any) {
  const node = nodeManager.createInstance(type, props, rootContainer, hostContext);
  nodeToProps.set(node, { ...props });
  causalityTracker.recordMount(node);
  return node;
}

function trackCommitUpdate(node: any, updatePayload: any, oldType: any, newType: any) {
  const oldProps = nodeToProps.get(node);
  nodeManager.commitUpdate(node, updatePayload, oldType, newType);
  const newProps = node.props || {};

  if (oldProps) {
    const propDiff = shallowDiff(oldProps as Record<string, unknown>, newProps as Record<string, unknown>);
    if (propDiff) {
      causalityTracker.recordUpdate(
        node,
        'props',
        oldProps as Record<string, unknown>,
        newProps as Record<string, unknown>
      );
    } else {
      causalityTracker.recordParentUpdate(node);
    }
  } else {
    causalityTracker.recordUpdate(node, 'mount');
  }

  nodeToProps.set(node, { ...newProps });
}

function trackCommitTextUpdate(node: any, oldText: string, newText: string) {
  const oldProps = nodeToProps.get(node);
  nodeManager.commitTextUpdate(node, oldText, newText);

  if (oldText !== newText) {
    causalityTracker.recordUpdate(
      node,
      'props',
      { children: oldText },
      { children: newText }
    );
  }

  nodeToProps.set(node, { children: newText });
}

export const causalityReconciler = ReactReconciler({
  createInstance: trackCreateInstance,

  createTextInstance(text: string, rootContainer: any, hostContext: any) {
    return nodeManager.createTextInstance(text, rootContainer, hostContext);
  },

  appendChild(parent: any, child: any) {
    nodeManager.appendChild(parent, child);
  },

  appendInitialChild(parent: any, child: any) {
    nodeManager.appendInitialChild(parent, child);
  },

  removeChild(parent: any, child: any) {
    nodeToProps.delete(child);
    nodeManager.removeChild(parent, child);
  },

  appendChildToContainer(container: any, child: any) {
    nodeManager.appendChildToContainer(container, child);
  },

  removeChildFromContainer(container: any, child: any) {
    nodeToProps.delete(child);
    nodeManager.removeChildFromContainer(container, child);
  },

  insertBefore(parent: any, child: any, beforeChild: any) {
    nodeManager.insertBefore(parent, child, beforeChild);
  },

  insertInContainerBefore(container: any, child: any, beforeChild: any) {
    nodeManager.insertInContainerBefore(container, child, beforeChild);
  },

  commitUpdate: trackCommitUpdate,

  commitTextUpdate: trackCommitTextUpdate,

  resetAfterCommit,

  supportsMutation: true,
  supportsPersistence: false,
  supportsHydration: false,
  isPrimaryRenderer: false,
  warnsIfNotActing: true,

  getCurrentEventPriority: () => 0 as any,
  schedulePassiveEffects: (cb: any) => {
    if (typeof setImmediate !== 'undefined') {
      setImmediate(cb);
    } else {
      setTimeout(cb, 0);
    }
    resetAfterCommit();
  },
  cancelPassiveEffects: (cb: any) => {
    if (typeof clearImmediate !== 'undefined') {
      clearImmediate(cb);
    } else {
      clearTimeout(cb);
    }
  },
  afterActiveEffects: () => {},
  scheduleDeferredCallback: (cb: any) => setTimeout(cb, 0),
  cancelDeferredCallback: (cb: { id: number | NodeJS.Timeout }) => clearTimeout(cb.id),
  noTimeout: -1,
  scheduleMicrotask: (cb: any) => Promise.resolve().then(cb),
  cancelMicrotask: () => {},
  shouldSetTextContent: (type: string, props: any) => nodeManager.shouldSetTextContent(),
  prepareForCommit: () => nodeManager.prepareForCommit(),
  preparePortalMount: () => {},
  resetTextContent: () => {},
  clearContainer: (container: any) => {
    nodeManager.clearContainer(container);
    return false;
  },

  getRootHostContext: () => nodeManager.getRootHostContext(),
  getChildHostContext: (parentHostContext: any, type: string, rootContainer: any) =>
    nodeManager.getChildHostContext(parentHostContext, type, rootContainer),
  preparePlacement: () => {},
  finalizeInitialChildren: () => nodeManager.finalizeInitialChildren(),
  prepareUpdate: () => nodeManager.prepareUpdate(),
  commitMount: () => {},
  hideInstance: () => {},
  unhideInstance: () => {},
});

export function resetCausality(): void {
  causalityTracker.clear();
  nodeToProps.clear();
}

export function getNodeProps(node: any): any {
  return nodeToProps.get(node);
}

export function enableInputHandlers() {
  if (typeof process !== 'undefined' && process.stdin) {
    inputManager.enableRawMode();

    const onData = (data: Buffer) => {
      const str = data.toString();
      for (let i = 0; i < str.length; i++) {
        const char = str[i];
        const event = {
          name: char,
          shift: false,
          ctrl: false,
          meta: false,
          code: `Key${char.toUpperCase()}`,
          sequence: str,
        };
        inputManager.emit('keydown', event);
        inputManager.emit('keypress', event);
      }
    };

    process.stdin.on('data', onData);

    const cleanup = () => {
      inputManager.disableRawMode();
      if (process.stdout) {
        process.stdout.write('\x1b[?25h');
        process.stdout.write('\x1b[0m');
        process.stdout.write('\x1b[2J\x1b[0;H');
      }
      process.stdin.off('data', onData);
      process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    process.on('beforeExit', cleanup);
  }
}