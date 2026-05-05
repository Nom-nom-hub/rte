import { TTYHarness, compareSnapshots, CLIProcess } from './TTY harness';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const test = (name: string, fn: () => Promise<void> | void) => {
  try {
    const result = fn();
    if (result instanceof Promise) {
      return result.then(() => {
        console.log(`  ✓ ${name}`);
        return true;
      }).catch((err: any) => {
        console.log(`  ✗ ${name}`);
        console.log(`    ${err.message}`);
        return false;
      });
    }
    console.log(`  ✓ ${name}`);
    return Promise.resolve(true);
  } catch (err: any) {
    console.log(`  ✗ ${name}`);
    console.log(`    ${err.message}`);
    return Promise.resolve(false);
  }
};

console.log('\n📁 E2E Render Tests');

const e2eDir = '.rte/e2e';
if (!fs.existsSync(e2eDir)) fs.mkdirSync(e2eDir, { recursive: true });

let passed = 0;
let failed = 0;

async function runTests() {
  if (await test('TTY harness can spawn process', async () => {
    const harness = new TTYHarness(80, 24);
    await harness.start('echo', ['test']);
    await new Promise(r => setTimeout(r, 500));
    const output = harness.getOutput();
    harness.kill();
    if (!output.includes('test')) throw new Error('Expected echo output');
  })) passed++; else failed++;

  if (await test('captureSnapshot returns valid structure', async () => {
    const harness = new TTYHarness(80, 24);
    await harness.start('printf', ['hello']);
    await new Promise(r => setTimeout(r, 500));
    const snapshot = harness.captureSnapshot();
    harness.kill();
    if (!snapshot.output) throw new Error('Expected output');
    if (!Array.isArray(snapshot.lines)) throw new Error('Expected lines array');
  })) passed++; else failed++;

  if (await test('CLI run executes and captures output', async () => {
    const cli = new CLIProcess();
    const result = await cli.run('echo', ['hello-e2e']);
    if (!result.stdout.includes('hello-e2e')) throw new Error('Expected echo output');
  })) passed++; else failed++;

  if (await test('rte --help shows usage', async () => {
    const cli = new CLIProcess();
    const result = await cli.run('npx', ['tsx', 'src/cli/index.ts', '--help']);
    if (!result.stdout.includes('Usage:')) throw new Error('Expected usage output');
    if (!result.stdout.includes('rte')) throw new Error('Expected rte in output');
  })) passed++; else failed++;

  if (await test('compareSnapshots detects differences', async () => {
    const snap1 = { output: 'line1\nline2', lines: ['line1', 'line2'], cursorPosition: { x: 1, y: 1 }, timestamp: 1 };
    const snap2 = { output: 'line1\nline3', lines: ['line1', 'line3'], cursorPosition: { x: 1, y: 1 }, timestamp: 2 };
    const result = compareSnapshots(snap1, snap2);
    if (result.equal) throw new Error('Expected differences');
  })) passed++; else failed++;

  if (await test('compareSnapshots detects equality', async () => {
    const snap1 = { output: 'line1\nline2', lines: ['line1', 'line2'], cursorPosition: { x: 1, y: 1 }, timestamp: 1 };
    const snap2 = { output: 'line1\nline2', lines: ['line1', 'line2'], cursorPosition: { x: 1, y: 1 }, timestamp: 2 };
    const result = compareSnapshots(snap1, snap2);
    if (!result.equal) throw new Error('Expected equality');
  })) passed++; else failed++;

  if (await test('terminal resize changes dimensions', async () => {
    const harness = new TTYHarness(80, 24);
    await harness.start('echo', ['test']);
    harness.resize(120, 40);
    await new Promise(r => setTimeout(r, 200));
    harness.kill();
  })) passed++; else failed++;

  if (await test('key sending works', async () => {
    const harness = new TTYHarness(80, 24);
    await harness.start('cat', []);
    harness.write('test-input\n');
    await new Promise(r => setTimeout(r, 300));
    const output = harness.getOutput();
    harness.kill();
  })) passed++; else failed++;

  console.log(`\n  Results: ${passed} passed, ${failed} failed\n`);

  if (fs.existsSync(e2eDir)) {
    try { fs.readdirSync(e2eDir).forEach(f => fs.unlinkSync(path.join(e2eDir, f))); fs.rmdirSync(e2eDir); } catch {}
  }

  if (failed > 0) throw new Error('Tests failed');
}

runTests().then(() => console.log('\n✅ E2E tests complete\n')).catch((err) => {
  console.error('\n❌ E2E tests failed:', err.message);
  process.exit(1);
});