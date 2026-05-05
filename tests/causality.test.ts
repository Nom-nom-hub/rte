import { getCausalityTracker, shallowDiff } from '../src/deterministic/causality';

const test = (name: string, fn: () => void) => {
  try { fn(); console.log(`  ✓ ${name}`); return true; }
  catch (err: any) { console.log(`  ✗ ${name}`); console.log(`    ${err.message}`); return false; }
};

const tracker = getCausalityTracker();

console.log('\n📁 Causality Tests');
let passed = 0, failed = 0;

if (test('getCausalityTracker returns instance', () => {
  if (!tracker) throw new Error('Expected tracker');
})) passed++; else failed++;

if (test('shallowDiff works for state changes', () => {
  const diff = shallowDiff({ count: 1 }, { count: 2 });
  if (!diff) throw new Error('Expected diff');
})) passed++; else failed++;

if (test('shallowDiff works for props changes', () => {
  const diff = shallowDiff({ color: 'red' }, { color: 'blue' });
  if (!diff) throw new Error('Expected diff');
})) passed++; else failed++;

if (test('shallowDiff returns null for identical', () => {
  const diff = shallowDiff({ x: 1 }, { x: 1 });
  if (diff !== null) throw new Error('Expected null');
})) passed++; else failed++;

console.log(`\n  Results: ${passed} passed, ${failed} failed\n`);
if (failed > 0) throw new Error('Tests failed');