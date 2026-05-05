import React from 'react';
import { render } from '../../src/core/render';
import { getFrameStore, hashFrame } from '../../src/deterministic/frameStore';
import { getCausalityTracker } from '../../src/deterministic/causality';
import { nodeManager } from '../../src/core/hostConfig';
import { computeLayout } from '../../src/layout/yoga';
import { drawToBuffer } from '../../src/renderer/draw';
import type { Frame, FrameBuffer } from '../../src/renderer/frameBuffer';
import type { UpdateReason } from '../../src/deterministic/causality';

export interface RenderResult {
  frame: Frame | null;
  frames: Frame[];
  buffer: FrameBuffer;
  hash: string;
  updates: UpdateReason[];
}

function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function setupMockProcess(): void {
  if (typeof process !== 'undefined') {
    if (!process.stdout) {
      (process as any).stdout = { columns: 80, rows: 24, write: () => {} };
    } else {
      if (!process.stdout.columns) Object.defineProperty(process.stdout, 'columns', { value: 80, writable: true, configurable: true });
      if (!process.stdout.rows) Object.defineProperty(process.stdout, 'rows', { value: 24, writable: true, configurable: true });
    }
  }
}

function forceFrameCapture(): Frame | null {
  const rootNode = nodeManager.getRootNode();
  if (!rootNode) return null;

  const width = 80;
  const height = 24;

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

  const hash = hashFrame(tree, buffer);
  const frameStore = getFrameStore();
  const updates = getCausalityTracker().getAllUpdates();

  const frame = { tree, buffer, hash, updates };
  frameStore.addFrame(frame);

  return frame;
}

export async function renderToTest(
  _element: React.ReactElement,
  _options: { width?: number; height?: number } = {}
): Promise<RenderResult> {
  setupMockProcess();

  const frameStore = getFrameStore();
  const causalityTracker = getCausalityTracker();

  frameStore.clear();
  causalityTracker.clear();

  const container = {
    children: [],
    __isTermContainer: true,
  };

  let instance: any = null;

  try {
    instance = render(_element, container);

    await wait(100);

    let frame = frameStore.getLatestFrame();
    let frames = frameStore.getFrames();

    if (!frame) {
      frame = forceFrameCapture();
      frames = frameStore.getFrames();
    }

    if (instance && instance.stop) {
      try { instance.stop(); } catch (e) {}
    }

    if (!frame) {
      console.log('  [debug] No frame captured, frames in store:', frames.length);
    }

    return {
      frame,
      frames,
      buffer: frame?.buffer || [],
      hash: frame?.hash || '',
      updates: frame?.updates || [],
    };
  } catch (error: any) {
    console.log('  [debug] Render error:', error.message);
    if (instance && instance.stop) {
      try { instance.stop(); } catch (e) {}
    }
    throw error;
  }
}

export async function renderMultipleTimes(
  element: React.ReactElement,
  times: number = 3,
  options: { width?: number; height?: number } = {}
): Promise<string[]> {
  const hashes: string[] = [];

  for (let i = 0; i < times; i++) {
    const result = await renderToTest(element, options);
    hashes.push(result.hash);
  }

  return hashes;
}

export function createSnapshot(frame: Frame): string {
  return JSON.stringify({
    hash: frame.hash,
    tree: frame.tree,
    bufferDimensions: {
      rows: frame.buffer.length,
      cols: frame.buffer[0]?.length || 0,
    },
    updates: frame.updates,
  }, null, 2);
}