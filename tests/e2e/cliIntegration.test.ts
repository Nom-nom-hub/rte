import { CLIProcess } from './TTY harness';
import fs from 'fs';
import path from 'path';

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

const testDir = '.rte/e2e-cli';
const sessionsDir = '.rte/sessions';
const snapshotsDir = '.rte/e2e-snapshots';

[testDir, sessionsDir, snapshotsDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

console.log('\n📁 CLI Integration Tests');

let passed = 0;
let failed = 0;

async function runTests() {
  if (await test('rte --version shows version', async () => {
    const cli = new CLIProcess();
    const result = await cli.run('npx', ['tsx', 'src/cli/index.ts', '--version']);
    if (!result.stdout.trim()) throw new Error('Expected version output');
  })) passed++; else failed++;

  if (await test('rte --help shows all commands', async () => {
    const cli = new CLIProcess();
    const result = await cli.run('npx', ['tsx', 'src/cli/index.ts', '--help']);
    const hasCommands = ['dev', 'replay', 'snapshot', 'inspect', 'diff', 'verify'].every(cmd => result.stdout.includes(cmd));
    if (!hasCommands) throw new Error('Expected all commands in help');
  })) passed++; else failed++;

  if (await test('rte dev --help shows dev options', async () => {
    const cli = new CLIProcess();
    const result = await cli.run('npx', ['tsx', 'src/cli/index.ts', 'dev', '--help']);
    if (!result.stdout.includes('--port')) throw new Error('Expected --port option');
    if (!result.stdout.includes('--save-session')) throw new Error('Expected --save-session option');
  })) passed++; else failed++;

  if (await test('rte diff --help shows diff options', async () => {
    const cli = new CLIProcess();
    const result = await cli.run('npx', ['tsx', 'src/cli/index.ts', 'diff', '--help']);
    if (!result.stdout.includes('--visual')) throw new Error('Expected --visual option');
    if (!result.stdout.includes('--json')) throw new Error('Expected --json option');
  })) passed++; else failed++;

  if (await test('rte verify --help shows verify options', async () => {
    const cli = new CLIProcess();
    const result = await cli.run('npx', ['tsx', 'src/cli/index.ts', 'verify', '--help']);
    if (!result.stdout.includes('--generate')) throw new Error('Expected --generate option');
    if (!result.stdout.includes('--entry')) throw new Error('Expected --entry option');
  })) passed++; else failed++;

  if (await test('rte diff with missing file shows error', async () => {
    const cli = new CLIProcess();
    const result = await cli.run('npx', ['tsx', 'src/cli/index.ts', 'diff', 'nonexistent.json', 'alsononexistent.json']);
    if (result.exitCode === 0) throw new Error('Expected non-zero exit code');
    if (!result.stderr.includes('not found') && !result.stdout.includes('not found')) throw new Error('Expected error message');
  })) passed++; else failed++;

  if (await test('rte verify with missing file shows error', async () => {
    const cli = new CLIProcess();
    const result = await cli.run('npx', ['tsx', 'src/cli/index.ts', 'verify', 'nonexistent.json']);
    if (result.exitCode === 0) throw new Error('Expected non-zero exit code');
  })) passed++; else failed++;

  console.log(`\n  Results: ${passed} passed, ${failed} failed\n`);

  [testDir, snapshotsDir].forEach(dir => {
    if (fs.existsSync(dir)) {
      try { fs.readdirSync(dir).forEach(f => fs.unlinkSync(path.join(dir, f))); fs.rmdirSync(dir); } catch {}
    }
  });

  if (failed > 0) throw new Error('Tests failed');
}

runTests().then(() => console.log('\n✅ CLI integration tests complete\n')).catch((err) => {
  console.error('\n❌ CLI integration tests failed:', err.message);
  process.exit(1);
});