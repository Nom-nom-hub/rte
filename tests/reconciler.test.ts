import { shallowDiff } from '../src/deterministic/causality';

const test = (name: string, fn: () => void) => {
  try { fn(); console.log(`  ✓ ${name}`); return true; }
  catch (err: any) { console.log(`  ✗ ${name}`); console.log(`    ${err.message}`); return false; }
};

console.log('\n📁 Reconciler Tests');
let passed = 0, failed = 0;

if (test('shallowDiff detects prop changes', () => {
  const diff = shallowDiff({ a: 1 }, { a: 2 });
  if (!diff) throw new Error('Expected diff');
  if (!diff.a) throw new Error('Expected a in diff');
})) passed++; else failed++;

if (test('shallowDiff returns null for identical objects', () => {
  const diff = shallowDiff({ a: 1 }, { a: 1 });
  if (diff !== null) throw new Error('Expected null');
})) passed++; else failed++;

if (test('shallowDiff detects added props', () => {
  const diff = shallowDiff({ a: 1 }, { a: 1, b: 2 });
  if (!diff || !diff.b) throw new Error('Expected b in diff');
})) passed++; else failed++;

if (test('shallowDiff detects removed props', () => {
  const diff = shallowDiff({ a: 1, b: 2 }, { a: 1 });
  if (!diff || !diff.b) throw new Error('Expected b in diff');
})) passed++; else failed++;

console.log(`\n  Results: ${passed} passed, ${failed} failed\n`);
if (failed > 0) throw new Error('Tests failed');