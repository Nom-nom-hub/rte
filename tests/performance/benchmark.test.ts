import { getFrameStore } from '../../src/deterministic/frameStore';
import { diffFrameBuffers } from '../../src/renderer/diff';
import { Box, Text } from '../../src/index';
import React from 'react';

function getMemoryMB(): number {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    return process.memoryUsage().heapUsed / (1024 * 1024);
  }
  return 0;
}

function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

console.log('\n📁 Performance Benchmark Tests');

let passed = 0;
let failed = 0;

async function runTest(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    return true;
  } catch (err: any) {
    console.log(`  ✗ ${name}`);
    console.log(`    ${err.message}`);
    return false;
  }
}

if (await runTest('benchmark runner initializes', async () => {
  const frameStore = getFrameStore();
  frameStore.clear();
})) passed++; else failed++;

if (await runTest('diff computation performance', async () => {
  const buffer1 = Array(24).fill(null).map(() => Array(80).fill({ char: ' ', style: undefined }));
  const buffer2 = Array(24).fill(null).map(() => Array(80).fill({ char: 'X', style: undefined }));

  const start = performance.now();
  for (let i = 0; i < 100; i++) {
    diffFrameBuffers(buffer1, buffer2);
  }
  const time = performance.now() - start;
  const avgTime = time / 100;

  if (avgTime > 10) throw new Error('Diff too slow: ' + avgTime + 'ms avg');
})) passed++; else failed++;

if (await runTest('memory tracking works', async () => {
  const startMem = getMemoryMB();

  const buffer = Array(100).fill(null).map(() => Array(100).fill({ char: 'x', style: undefined }));
  diffFrameBuffers(buffer, buffer);

  const endMem = getMemoryMB();
  const growth = endMem - startMem;

  if (growth > 20) throw new Error('Memory grew too much: ' + growth + 'MB');
})) passed++; else failed++;

if (await runTest('frame store operations are fast', async () => {
  const frameStore = getFrameStore();
  frameStore.clear();

  const buffer = Array(24).fill(null).map(() => Array(80).fill({ char: ' ', style: undefined }));

  const start = performance.now();
  for (let i = 0; i < 1000; i++) {
    frameStore.addFrame({ tree: {}, buffer, hash: 'test123456789012', updates: [] });
  }
  const time = performance.now() - start;

  if (time > 100) throw new Error('Frame store too slow: ' + time + 'ms');
})) passed++; else failed++;

if (await runTest('component creation is fast', async () => {
  const start = performance.now();

  for (let i = 0; i < 100; i++) {
    React.createElement(Box, { width: 40, height: 20 },
      React.createElement(Text, { children: 'Test' })
    );
  }

  const time = performance.now() - start;

  if (time > 50) throw new Error('Component creation too slow: ' + time + 'ms');
})) passed++; else failed++;

console.log(`\n  Results: ${passed} passed, ${failed} failed\n`);

if (failed > 0) throw new Error('Performance tests failed');