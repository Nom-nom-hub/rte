import fs from 'fs';
import path from 'path';
import type { Frame } from '../../src/renderer/frameBuffer';

export interface Snapshot {
  hash: string;
  timestamp: number;
  tree: any;
  bufferDimensions: { rows: number; cols: number };
  updates: any[];
}

export class SnapshotHelper {
  private snapshotDir: string;

  constructor(snapshotDir = '.rte/snapshots') {
    this.snapshotDir = snapshotDir;
    this.ensureDir();
  }

  private ensureDir(): void {
    if (!fs.existsSync(this.snapshotDir)) {
      fs.mkdirSync(this.snapshotDir, { recursive: true });
    }
  }

  create(frame: Frame): Snapshot {
    return {
      hash: frame.hash,
      timestamp: Date.now(),
      tree: frame.tree,
      bufferDimensions: {
        rows: frame.buffer.length,
        cols: frame.buffer[0]?.length || 0,
      },
      updates: frame.updates || [],
    };
  }

  save(name: string, snapshot: Snapshot): string {
    const filepath = path.join(this.snapshotDir, `${name}.json`);
    fs.writeFileSync(filepath, JSON.stringify(snapshot, null, 2));
    return filepath;
  }

  load(name: string): Snapshot | null {
    const filepath = path.join(this.snapshotDir, `${name}.json`);
    if (!fs.existsSync(filepath)) {
      return null;
    }
    const content = fs.readFileSync(filepath, 'utf-8');
    return JSON.parse(content) as Snapshot;
  }

  compare(snapshotA: Snapshot, snapshotB: Snapshot): { equal: boolean; differences: string[] } {
    const differences: string[] = [];

    if (snapshotA.hash !== snapshotB.hash) {
      differences.push(`Hash mismatch: ${snapshotA.hash} vs ${snapshotB.hash}`);
    }

    if (snapshotA.bufferDimensions.rows !== snapshotB.bufferDimensions.rows) {
      differences.push(`Row count mismatch: ${snapshotA.bufferDimensions.rows} vs ${snapshotB.bufferDimensions.rows}`);
    }

    if (snapshotA.bufferDimensions.cols !== snapshotB.bufferDimensions.cols) {
      differences.push(`Column count mismatch: ${snapshotA.bufferDimensions.cols} vs ${snapshotB.bufferDimensions.cols}`);
    }

    return {
      equal: differences.length === 0,
      differences,
    };
  }

  listSnapshots(): string[] {
    if (!fs.existsSync(this.snapshotDir)) {
      return [];
    }
    return fs.readdirSync(this.snapshotDir)
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace('.json', ''));
  }

  delete(name: string): boolean {
    const filepath = path.join(this.snapshotDir, `${name}.json`);
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
      return true;
    }
    return false;
  }
}

export const snapshotHelper = new SnapshotHelper();