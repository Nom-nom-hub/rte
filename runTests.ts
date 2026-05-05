import('./tests/determinism.test.ts').then(async () => {
  console.log('\n========================================\n');
  await import('./tests/reconciler.test.ts');
  console.log('\n========================================\n');
  await import('./tests/layout.test.ts');
  console.log('\n========================================\n');
  await import('./tests/frameRendering.test.ts');
  console.log('\n========================================\n');
  await import('./tests/causality.test.ts');
  console.log('\n========================================\n');
  await import('./tests/cli.test.ts');
  console.log('\n========================================\n');
  console.log('🔄 Running E2E tests...\n');
  await import('./tests/e2e/render.test.ts');
  console.log('\n========================================\n');
  await import('./tests/e2e/cliIntegration.test.ts');
  console.log('\n========================================\n');
  await import('./tests/e2e/sessionReplay.test.ts');
  console.log('\n========================================\n');
  console.log('⚡ Running Performance Tests...\n');
  await import('./tests/performance/benchmark.test.ts');
  console.log('\n========================================\n');
  console.log('✅ All test suites complete\n');
}).catch((err) => {
  console.error('\n❌ Test suite failed:', err.message);
  process.exit(1);
});