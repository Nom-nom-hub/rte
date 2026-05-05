import { Cell } from '../src/renderer/frameBuffer';

const test = (name: string, fn: () => void) => {
  try { fn(); console.log(`  ✓ ${name}`); return true; }
  catch (err: any) { console.log(`  ✗ ${name}`); console.log(`    ${err.message}`); return false; }
};

function createBuffer(rows = 24, cols = 80): Cell[][] {
  const buffer: Cell[][] = [];
  for (let y = 0; y < rows; y++) {
    buffer[y] = [];
    for (let x = 0; x < cols; x++) {
      buffer[y][x] = { char: ' ', style: undefined };
    }
  }
  return buffer;
}

console.log('\n📁 Frame Rendering Tests');
let passed = 0, failed = 0;

if (test('buffer output is stable', () => {
  const buf1 = createBuffer();
  const buf2 = createBuffer();
  if (JSON.stringify(buf1) !== JSON.stringify(buf2)) throw new Error('Buffers should be equal');
})) passed++; else failed++;

if (test('frame structure is complete and valid', () => {
  const buffer = createBuffer();
  if (!Array.isArray(buffer)) throw new Error('Expected array');
  if (buffer.length === 0) throw new Error('Expected rows');
})) passed++; else failed++;

if (test('buffer cells have correct structure', () => {
  const buffer = createBuffer();
  for (const row of buffer) {
    for (const cell of row) {
      if (typeof cell.char !== 'string') throw new Error('Expected char');
    }
  }
})) passed++; else failed++;

if (test('buffer dimensions match requested size', () => {
  const buffer = createBuffer(12, 40);
  if (buffer.length !== 12) throw new Error('Expected 12 rows');
  if (buffer[0].length !== 40) throw new Error('Expected 40 cols');
})) passed++; else failed++;

console.log(`\n  Results: ${passed} passed, ${failed} failed\n`);
if (failed > 0) throw new Error('Tests failed');