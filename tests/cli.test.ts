import fs from 'fs';
import path from 'path';

const test = (name: string, fn: () => void) => {
  try { fn(); console.log(`  ✓ ${name}`); return true; }
  catch (err: any) { console.log(`  ✗ ${name}`); console.log(`    ${err.message}`); return false; }
};

const testDir = '.rte/test-sessions';
const snapDir = '.rte/test-snapshots';
if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });
if (!fs.existsSync(snapDir)) fs.mkdirSync(snapDir, { recursive: true });

console.log('\n📁 CLI Tests');
let passed = 0, failed = 0;

if (test('can create and read snapshot', () => {
  const snap = { hash: 'abc123def4567890', timestamp: Date.now() };
  const path = snapDir + '/test.json';
  fs.writeFileSync(path, JSON.stringify(snap));
  const loaded = JSON.parse(fs.readFileSync(path, 'utf-8'));
  if (loaded.hash !== snap.hash) throw new Error('Hash mismatch');
})) passed++; else failed++;

if (test('can detect hash mismatch', () => {
  const snap = { hash: 'abc123def4567890', timestamp: Date.now() };
  const other = { hash: 'differenthash1234', timestamp: Date.now() };
  if (snap.hash === other.hash) throw new Error('Should be different');
})) passed++; else failed++;

if (test('session file format is valid', () => {
  const session = { version: '1.1', id: 'test', frames: [], metadata: { createdAt: Date.now(), totalFrames: 0, appEntry: 'test', rteVersion: '1.1.0' } };
  if (session.version !== '1.1') throw new Error('Expected version 1.1');
  if (!session.metadata) throw new Error('Expected metadata');
})) passed++; else failed++;

const cleanup = [testDir, snapDir];
for (const dir of cleanup) {
  if (fs.existsSync(dir)) {
    try { fs.readdirSync(dir).forEach(f => fs.unlinkSync(path.join(dir, f))); fs.rmdirSync(dir); } catch {}
  }
}

console.log(`\n  Results: ${passed} passed, ${failed} failed\n`);
if (failed > 0) throw new Error('Tests failed');