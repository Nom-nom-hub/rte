import { createHash } from 'crypto';
import { Frame } from '../renderer/frameBuffer';

const FRAME_HISTORY_LIMIT = 100;

class FrameStore {
  private frames: Frame[] = [];
  private maxFrames: number;

  constructor(maxFrames: number = FRAME_HISTORY_LIMIT) {
    this.maxFrames = maxFrames;
  }

  addFrame(frame: Frame): void {
    this.frames.push(frame);
    if (this.frames.length > this.maxFrames) {
      this.frames.shift();
    }
  }

  getFrames(): Frame[] {
    return [...this.frames];
  }

  getLatestFrame(): Frame | null {
    return this.frames.length > 0 ? this.frames[this.frames.length - 1] : null;
  }

  getFrameAt(index: number): Frame | null {
    if (index < 0 || index >= this.frames.length) return null;
    return this.frames[index];
  }

  clear(): void {
    this.frames = [];
  }

  size(): number {
    return this.frames.length;
  }
}

let frameStoreInstance: FrameStore | null = null;

export function getFrameStore(): FrameStore {
  if (!frameStoreInstance) {
    frameStoreInstance = new FrameStore();
  }
  return frameStoreInstance;
}

export function hashFrame(tree: any, buffer: any[][]): string {
  const data = JSON.stringify({ tree, buffer }, (key, value) => {
    if (key === 'yogaNode' || key === 'parent' || key === 'internal') {
      return undefined;
    }
    return value;
  });
  return createHash('sha256').update(data).digest('hex').substring(0, 16);
}
