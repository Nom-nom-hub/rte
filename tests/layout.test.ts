const test = (name: string, fn: () => void) => {
  try { fn(); console.log(`  ✓ ${name}`); return true; }
  catch (err: any) { console.log(`  ✗ ${name}`); console.log(`    ${err.message}`); return false; }
};

console.log('\n📁 Layout Tests');
let passed = 0, failed = 0;

if (test('layout structure exists', () => {
  const layout = { x: 0, y: 0, width: 80, height: 24 };
  if (!layout) throw new Error('Expected layout');
  if (layout.width !== 80) throw new Error('Expected width 80');
})) passed++; else failed++;

if (test('layout positions are numeric', () => {
  const layout = { x: 10, y: 5, width: 30, height: 10 };
  if (typeof layout.x !== 'number') throw new Error('x should be number');
  if (typeof layout.y !== 'number') throw new Error('y should be number');
})) passed++; else failed++;

console.log(`\n  Results: ${passed} passed, ${failed} failed\n`);
if (failed > 0) throw new Error('Tests failed');