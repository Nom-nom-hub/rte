import ReactReconciler from 'react-reconciler';
import { nodeManager } from './hostConfig';
import { getFrameStore } from '../deterministic/frameStore';
import { computeLayout } from '../layout/yoga';
import { drawToBuffer } from '../renderer/draw';
import { diffFrameBuffers, applyAnsiDiff } from '../renderer/diff';
import { clearScreen, hideCursor, showCursor } from '../renderer/ansi';
import { hashFrame } from '../deterministic/frameStore';
import type { Node as InternalNode } from '../tree/node';
import { inputManager } from '../input/input';
import http from 'http';
import Yoga from 'yoga-layout-prebuilt';

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

  const frame = { tree, buffer, hash };
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
}

export const reconciler = ReactReconciler({
  createInstance(type: string, props: any, rootContainer: any, hostContext: any) {
    return nodeManager.createInstance(type, props, rootContainer, hostContext);
  },

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
    nodeManager.removeChild(parent, child);
  },

  appendChildToContainer(container: any, child: any) {
    nodeManager.appendChildToContainer(container, child);
  },

  removeChildFromContainer(container: any, child: any) {
    nodeManager.removeChildFromContainer(container, child);
  },

  insertBefore(parent: any, child: any, beforeChild: any) {
    nodeManager.insertBefore(parent, child, beforeChild);
  },

  insertInContainerBefore(container: any, child: any, beforeChild: any) {
    nodeManager.insertInContainerBefore(container, child, beforeChild);
  },

  commitUpdate(node: any, updatePayload: any, oldType: any, newType: any) {
    nodeManager.commitUpdate(node, updatePayload, oldType, newType);
  },

  commitTextUpdate(node: any, oldText: string, newText: string) {
    nodeManager.commitTextUpdate(node, oldText, newText);
  },

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
    // Trigger render pipeline after passive effects
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

export function startApiServer(port: number = 3000) {
  const server = http.createServer((req, res) => {
    const frameStore = getFrameStore();
    const latestFrame = frameStore.getLatestFrame();

    if (req.method === 'GET' && req.url === '/ui/tree') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(latestFrame?.tree || null, null, 2));
    } else if (req.method === 'GET' && req.url === '/ui/frame') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(latestFrame || null, null, 2));
    } else if (req.method === 'POST' && req.url === '/ui/input') {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk.toString();
      });
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ received: data, status: 'ok' }));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON' }));
        }
      });
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  });

  server.listen(port, () => {
    console.log(`API server running on http://localhost:${port}`);
  });

  return server;
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
        process.stdout.write('\x1b[2J\x1b[0;0H');
      }
      process.stdin.off('data', onData);
      process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    process.on('beforeExit', cleanup);
  }
}
