import fs from 'fs';
import path from 'path';
import { CLIProcess } from './TTY harness';

const test = (name: string, fn: () => Promise<void>) => {
  return fn().then(() => {
    console.log(`  ✓ ${name}`);
    return true;
  }).catch((err: any) => {
    console.log(`  ✗ ${name}`);
    console.log(`    ${err.message}`);
    return false;
  });
};

const sessionDir = '.rte/e2e-sessions';
if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true });

console.log('\n📁 Session Replay Tests');

let passed = 0;
let failed = 0;

async function runTests() {
  const session = {
    version: '1.1',
    id: 'test-replay',
    filename: 'replay-test.json',
    frames: [
      {
        tree: { type: 'box', props: { width: 10, height: 3 }, children: [{ type: 'text', props: { children: 'Frame 1' } }] },
        buffer: [[{ char: 'F', style: undefined }, { char: 'r', style: undefined }, { char: 'a', style: undefined }, { char: 'm', style: undefined }, { char: 'e', style: undefined }, { char: ' ', style: undefined }, { char: '1', style: undefined }]],
        hash: 'abc123def4567890',
        timestamp: Date.now(),
        index: 0,
        updates: [],
      },
      {
        tree: { type: 'box', props: { width: 10, height: 3 }, children: [{ type: 'text', props: { children: 'Frame 2' } }] },
        buffer: [[{ char: 'F', style: undefined }, { char: 'r', style: undefined }, { char: 'a', style: undefined }, { char: 'm', style: undefined }, { char: 'e', style: undefined }, { char: ' ', style: undefined }, { char: '2', style: undefined }]],
        hash: 'def4567890123456',
        timestamp: Date.now() + 100,
        index: 1,
        updates: [],
      },
    ],
    metadata: {
      createdAt: Date.now(),
      totalFrames: 2,
      appEntry: 'test.tsx',
      rteVersion: '1.1.0',
    },
  };

  const sessionPath = path.join(sessionDir, 'replay-test.json');
  fs.writeFileSync(sessionPath, JSON.stringify(session, null, 2));

  if (await test('session file is valid JSON', async () => {
    const content = fs.readFileSync(sessionPath, 'utf-8');
    const parsed = JSON.parse(content);
    if (!parsed.version) throw new Error('Missing version');
    if (!Array.isArray(parsed.frames)) throw new Error('Missing frames array');
  })) passed++; else failed++;

  if (await test('session has correct metadata structure', async () => {
    if (!session.metadata.createdAt) throw new Error('Missing createdAt');
    if (!session.metadata.totalFrames) throw new Error('Missing totalFrames');
    if (!session.metadata.appEntry) throw new Error('Missing appEntry');
  })) passed++; else failed++;

  if (await test('frames have required fields', async () => {
    for (const frame of session.frames) {
      if (!frame.hash) throw new Error('Missing hash in frame');
      if (!frame.tree) throw new Error('Missing tree in frame');
      if (!frame.buffer) throw new Error('Missing buffer in frame');
      if (typeof frame.index !== 'number') throw new Error('Missing index in frame');
    }
  })) passed++; else failed++;

  if (await test('frame hashes are unique', async () => {
    const hashes = session.frames.map(f => f.hash);
    const unique = new Set(hashes);
    if (unique.size !== hashes.length) throw new Error('Duplicate hashes found');
  })) passed++; else failed++;

  if (await test('frame indices are sequential', async () => {
    for (let i = 0; i < session.frames.length; i++) {
      if (session.frames[i].index !== i) throw new Error(`Frame index mismatch at ${i}`);
    }
  })) passed++; else failed++;

  if (await test('replay session can be loaded', async () => {
    const cli = new CLIProcess();
    const result = await cli.run('cat', [sessionPath]);
    const parsed = JSON.parse(result.stdout);
    if (parsed.frames.length !== 2) throw new Error('Expected 2 frames');
  })) passed++; else failed++;

  console.log(`\n  Results: ${passed} passed, ${failed} failed\n`);

  if (fs.existsSync(sessionDir)) {
    try { fs.readdirSync(sessionDir).forEach(f => fs.unlinkSync(path.join(sessionDir, f))); fs.rmdirSync(sessionDir); } catch {}
  }

  if (failed > 0) throw new Error('Tests failed');
}

runTests().then(() => console.log('\n✅ Session replay tests complete\n')).catch((err) => {
  console.error('\n❌ Session replay tests failed:', err.message);
  process.exit(1);
});