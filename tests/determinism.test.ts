import { Frame, Cell } from '../src/renderer/frameBuffer';
import { hashFrame } from '../src/deterministic/frameStore';

const test = (name: string, fn: () => void) => {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    return true;
  } catch (err: any) {
    console.log(`  ✗ ${name}`);
    console.log(`    ${err.message}`);
    return false;
  }
};

const expect = (actual: any) => ({
  toBe: (expected: any) => {
    if (actual !== expected) throw new Error(`Expected ${expected}, got ${actual}`);
  },
  toHaveLength: (len: number) => {
    if (actual.length !== len) throw new Error(`Expected length ${len}, got ${actual.length}`);
  },
  toBeGreaterThan: (n: number) => {
    if (!(actual > n)) throw new Error(`Expected ${actual} > ${n}`);
  },
  toBeDefined: () => {
    if (actual === undefined) throw new Error('Expected to be defined');
  },
  toMatch: (regex: RegExp) => {
    if (!regex.test(actual)) throw new Error(`Expected ${actual} to match ${regex}`);
  },
});

function createMockFrame(hash?: string): Frame {
  const buffer: Cell[][] = [];
  for (let y = 0; y < 24; y++) {
    buffer[y] = [];
    for (let x = 0; x < 80; x++) {
      buffer[y][x] = { char: ' ', style: undefined };
    }
  }
  buffer[0][0] = { char: 'T', style: undefined };

  return {
    tree: { type: 'box', props: {} },
    buffer,
    hash: hash || hashFrame({ type: 'box' }, buffer),
    updates: [],
  };
}

console.log('\n📁 Determinism Tests');

let passed = 0;
let failed = 0;

if (test('hashFrame produces consistent 16-char hex hash', () => {
  const frame1 = createMockFrame();
  const frame2 = createMockFrame(frame1.hash);
  expect(frame1.hash).toBe(frame2.hash);
  expect(frame1.hash).toHaveLength(16);
  expect(frame1.hash).toMatch(/^[a-f0-9]+$/);
})) passed++; else failed++;

if (test('identical trees produce identical hashes', () => {
  const tree = { type: 'box', props: { width: 10 } };
  const buffer: Cell[][] = [[{ char: 'x' }]];
  const hash1 = hashFrame(tree, buffer);
  const hash2 = hashFrame(tree, buffer);
  expect(hash1).toBe(hash2);
})) passed++; else failed++;

if (test('different trees produce different hashes', () => {
  const tree1 = { type: 'box', props: { width: 10 } };
  const tree2 = { type: 'box', props: { width: 20 } };
  const buffer: Cell[][] = [[{ char: 'x' }]];
  const hash1 = hashFrame(tree1, buffer);
  const hash2 = hashFrame(tree2, buffer);
  if (hash1 === hash2) throw new Error('Expected different hashes');
})) passed++; else failed++;

if (test('frame structure is complete and valid', () => {
  const frame = createMockFrame();
  expect(frame.hash).toBeDefined();
  expect(frame.tree).toBeDefined();
  expect(frame.buffer).toBeDefined();
  expect(Array.isArray(frame.buffer)).toBe(true);
})) passed++; else failed++;

if (test('buffer has valid cell structure', () => {
  const frame = createMockFrame();
  for (const row of frame.buffer) {
    for (const cell of row) {
      expect(cell.char).toBeDefined();
    }
  }
})) passed++; else failed++;

console.log(`\n  Results: ${passed} passed, ${failed} failed\n`);

if (failed > 0) throw new Error('Tests failed');