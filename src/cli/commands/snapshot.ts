import fs from 'fs';
import { getFrameStore } from '../../deterministic/frameStore.js';
import { hashFrame } from '../../deterministic/frameStore.js';

export async function runSnapshot(options: { output: string }) {
  const frameStore = getFrameStore();
  const frame = frameStore.getLatestFrame();

  if (!frame) {
    console.error('Error: No frame available. Make sure the engine is running.');
    process.exit(1);
  }

  const snapshot = {
    hash: frame.hash,
    timestamp: Date.now(),
    tree: frame.tree,
    buffer: frame.buffer,
    dimensions: {
      rows: frame.buffer.length,
      cols: frame.buffer[0]?.length || 0,
    },
  };

  const outputJson = JSON.stringify(snapshot, null, 2);

  if (options.output) {
    const filepath = path.isAbsolute(options.output) ? options.output : path.resolve(process.cwd(), options.output);
    fs.writeFileSync(filepath, outputJson);
    console.log(`\x1b[32mSnapshot saved to: ${filepath}\x1b[0m`);
  } else {
    console.log(outputJson);
  }

  console.log(`\nHash: ${snapshot.hash}`);
  console.log(`Dimensions: ${snapshot.dimensions.cols}x${snapshot.dimensions.rows}`);
}

import path from 'path';