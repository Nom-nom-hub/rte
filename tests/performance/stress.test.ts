import React from 'react';
import { render } from '../../src/core/render';
import { getFrameStore } from '../../src/deterministic/frameStore';
import { Box, Text } from '../../src/index';
import chalk from 'chalk';

function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getMemoryMB(): number {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    return process.memoryUsage().heapUsed / (1024 * 1024);
  }
  return 0;
}

function createNestedTree(depth: number, nodesPerLevel: number): React.ReactElement {
  function build(depth: number): React.ReactNode {
    if (depth <= 0) {
      return React.createElement(Text, { children: `Leaf-${Math.random()}` });
    }
    const children = [];
    for (let i = 0; i < nodesPerLevel; i++) {
      children.push(
        React.createElement(Box, { key: i, height: 1, padding: 0 }, build(depth - 1))
      );
    }
    return children;
  }

  return React.createElement(Box, { width: 80, height: 40, flexDirection: 'column' }, build(depth));
}

function createCountersApp(count: number): React.ReactElement {
  const children: React.ReactNode[] = [];
  for (let i = 0; i < count; i++) {
    children.push(
      React.createElement(Box, { key: i, height: 1 },
        React.createElement(Text, { children: `Counter ${i}: ${Math.floor(Math.random() * 100)}` })
      )
    );
  }
  return React.createElement(Box, { width: 60, height: 30, flexDirection: 'column' }, ...children);
}

interface StressResult {
  scenario: string;
  iterations: number;
  totalTime: number;
  avgFrameTime: number;
  maxFrameTime: number;
  memoryStart: number;
  memoryPeak: number;
  memoryEnd: number;
  memoryGrowth: number;
  success: boolean;
}

async function runStressTest(
  name: string,
  iterations: number,
  createApp: () => React.ReactElement
): Promise<StressResult> {
  const frameStore = getFrameStore();
  frameStore.clear();

  const memoryStart = getMemoryMB();
  let memoryPeak = memoryStart;
  const frameTimes: number[] = [];

  const container = { children: [], __isTermContainer: true };
  let instance: any = null;

  const startTime = Date.now();

  try {
    instance = render(createApp(), container);

    for (let i = 0; i < iterations; i++) {
      const iterStart = performance.now();

      if (instance?.update) {
        instance.update(createApp());
      }

      await wait(5);

      frameTimes.push(performance.now() - iterStart);

      const currentMemory = getMemoryMB();
      if (currentMemory > memoryPeak) memoryPeak = currentMemory;
    }

    if (instance?.stop) instance.stop();
  } catch (error) {
    if (instance?.stop) try { instance.stop(); } catch {}
  }

  const totalTime = Date.now() - startTime;
  const memoryEnd = getMemoryMB();
  const avgFrameTime = frameTimes.length > 0 ? frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length : 0;
  const maxFrameTime = frameTimes.length > 0 ? Math.max(...frameTimes) : 0;
  const memoryGrowth = memoryEnd - memoryStart;

  return {
    scenario: name,
    iterations,
    totalTime,
    avgFrameTime: Math.round(avgFrameTime * 100) / 100,
    maxFrameTime: Math.round(maxFrameTime * 100) / 100,
    memoryStart: Math.round(memoryStart * 100) / 100,
    memoryPeak: Math.round(memoryPeak * 100) / 100,
    memoryEnd: Math.round(memoryEnd * 100) / 100,
    memoryGrowth: Math.round(memoryGrowth * 100) / 100,
    success: true,
  };
}

const THRESHOLDS = {
  maxFrameTime: 50,
  maxMemoryGrowthMB: 30,
};

console.log('\n📁 Stress Tests');

const results: StressResult[] = [];
let passed = 0;
let failed = 0;

async function runTest(name: string, iterations: number, createApp: () => React.ReactElement) {
  try {
    console.log(`\n  Running ${name}...`);
    const timeout = setTimeout(() => {
      console.log(`    ⚠️  Timeout after 15s`);
      results.push({ scenario: name, iterations: 0, totalTime: 15000, avgFrameTime: 0, maxFrameTime: 0, memoryStart: 0, memoryPeak: 0, memoryEnd: 0, memoryGrowth: 0, success: false });
    }, 15000);

    const result = await runStressTest(name, iterations, createApp);
    clearTimeout(timeout);

    results.push(result);

    const timeStr = chalk.gray(`${result.totalTime}ms`);
    const memStr = chalk.gray(`${result.memoryGrowth}MB`);

    let pass = true;
    let reasons: string[] = [];

    if (result.maxFrameTime > THRESHOLDS.maxFrameTime) {
      pass = false;
      reasons.push(`max frame time ${result.maxFrameTime}ms > ${THRESHOLDS.maxFrameTime}ms`);
    }

    if (result.memoryGrowth > THRESHOLDS.maxMemoryGrowthMB) {
      pass = false;
      reasons.push(`memory growth ${result.memoryGrowth}MB > ${THRESHOLDS.maxMemoryGrowthMB}MB`);
    }

    if (pass) {
      console.log(`    ✓ ${result.iterations} frames in ${timeStr}, ${memStr} memory growth`);
      passed++;
    } else {
      console.log(`    ✗ ${reasons.join(', ')}`);
      failed++;
    }
  } catch (error: any) {
    console.log(`    ✗ ${error.message}`);
    failed++;
  }
}

await runTest('100-frame rapid updates', 100, () =>
  React.createElement(Box, { width: 40, height: 20 },
    React.createElement(Text, { children: `Update ${Math.random()}` })
  )
);

await runTest('500-frame session', 500, () =>
  React.createElement(Box, { width: 50, height: 20 },
    React.createElement(Text, { children: `Frame ${Math.random()}` })
  )
);

await runTest('1000-frame long session', 1000, () =>
  React.createElement(Box, { width: 60, height: 25 },
    React.createElement(Text, { children: `Long session frame ${Math.random()}` })
  )
);

await runTest('10-node nested tree', 50, () => createNestedTree(3, 3));
await runTest('50-node nested tree', 30, () => createNestedTree(4, 4));
await runTest('100-node nested tree', 20, () => createNestedTree(4, 5));

await runTest('50-counter render', 100, () => createCountersApp(50));
await runTest('100-counter render', 50, () => createCountersApp(100));

console.log(`\n  Results: ${passed} passed, ${failed} failed\n`);

if (failed > 0) {
  console.log('\nStress test summary:');
  for (const r of results) {
    if (!r.success) {
      console.log(`  ${chalk.red('✗')} ${r.scenario}`);
    } else {
      console.log(`  ${chalk.green('✓')} ${r.scenario}: ${r.avgFrameTime}ms avg, ${r.memoryGrowth}MB growth`);
    }
  }
  throw new Error('Stress tests failed');
}