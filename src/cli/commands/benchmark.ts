import React from 'react';
import { render } from '../../core/render.js';
import { getFrameStore } from '../../deterministic/frameStore.js';
import { getCausalityTracker } from '../../deterministic/causality.js';
import { diffFrameBuffers } from '../../renderer/diff.js';
import { Box, Text } from '../../index.js';

export interface BenchmarkResult {
  avgRenderTime: number;
  maxRenderTime: number;
  minRenderTime: number;
  avgDiffTime: number;
  maxDiffTime: number;
  fps: number;
  totalFrames: number;
  memory: {
    start: number;
    peak: number;
    end: number;
  };
  scenario: string;
}

function getMemoryMB(): number {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    return process.memoryUsage().heapUsed / (1024 * 1024);
  }
  return 0;
}

function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function createLargeTree(depth: number, nodesPerLevel: number): React.ReactElement {
  function buildTree(currentDepth: number): React.ReactNode {
    if (currentDepth >= depth) {
      return React.createElement(Text, { children: `Node-${currentDepth}` });
    }

    const children: React.ReactNode[] = [];
    for (let i = 0; i < nodesPerLevel; i++) {
      children.push(
        React.createElement(Box, { key: i, height: 1 },
          buildTree(currentDepth + 1)
        )
      );
    }
    return children;
  }

  return React.createElement(Box, { width: 80, height: 24, flexDirection: 'column' },
    buildTree(0)
  );
}

function createRapidUpdateApp(): React.ReactElement {
  return React.createElement(Box, { width: 40, height: 10 },
    React.createElement(Text, { children: 'Rapid updates test' })
  );
}

function runBenchmarkInternal(
  scenario: string,
  iterations: number,
  delayBetweenFrames: number,
  treeDepth?: number,
  nodesPerLevel?: number
): Promise<BenchmarkResult> {
  return new Promise(async (resolve) => {
    const frameStore = getFrameStore();
    const causalityTracker = getCausalityTracker();

    frameStore.clear();
    causalityTracker.clear();

    const memoryStart = getMemoryMB();
    let memoryPeak = memoryStart;

    const renderTimes: number[] = [];
    const diffTimes: number[] = [];

    const container = {
      children: [],
      __isTermContainer: true,
    };

    let element: React.ReactElement;

    if (scenario === 'stress-large-tree' && treeDepth && nodesPerLevel) {
      element = createLargeTree(treeDepth, nodesPerLevel);
    } else {
      element = createRapidUpdateApp();
    }

    let instance: any = null;

    try {
      instance = render(element, container);

      for (let i = 0; i < iterations; i++) {
        const renderStart = performance.now();

        if (instance && instance.update) {
          instance.update(element);
        }

        await wait(delayBetweenFrames);

        const frame = frameStore.getLatestFrame();
        const renderEnd = performance.now();

        renderTimes.push(renderEnd - renderStart);

        if (frame) {
          const prevFrame = frameStore.getFrameAt(frameStore.size() - 2);
          if (prevFrame?.buffer) {
            const diffStart = performance.now();
            diffFrameBuffers(prevFrame.buffer, frame.buffer);
            diffTimes.push(performance.now() - diffStart);
          }
        }

        const currentMemory = getMemoryMB();
        if (currentMemory > memoryPeak) {
          memoryPeak = currentMemory;
        }
      }

      if (instance?.stop) {
        instance.stop();
      }
    } catch (error) {
      if (instance?.stop) {
        try { instance.stop(); } catch {}
      }
    }

    const memoryEnd = getMemoryMB();

    const avgRenderTime = renderTimes.length > 0
      ? renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length
      : 0;
    const maxRenderTime = renderTimes.length > 0 ? Math.max(...renderTimes) : 0;
    const minRenderTime = renderTimes.length > 0 ? Math.min(...renderTimes) : 0;

    const avgDiffTime = diffTimes.length > 0
      ? diffTimes.reduce((a, b) => a + b, 0) / diffTimes.length
      : 0;
    const maxDiffTime = diffTimes.length > 0 ? Math.max(...diffTimes) : 0;

    const totalTime = iterations * (delayBetweenFrames + avgRenderTime);
    const fps = totalTime > 0 ? (iterations / (totalTime / 1000)) : 0;

    resolve({
      avgRenderTime: Math.round(avgRenderTime * 100) / 100,
      maxRenderTime: Math.round(maxRenderTime * 100) / 100,
      minRenderTime: Math.round(minRenderTime * 100) / 100,
      avgDiffTime: Math.round(avgDiffTime * 100) / 100,
      maxDiffTime: Math.round(maxDiffTime * 100) / 100,
      fps: Math.round(fps * 10) / 10,
      totalFrames: iterations,
      memory: {
        start: Math.round(memoryStart * 100) / 100,
        peak: Math.round(memoryPeak * 100) / 100,
        end: Math.round(memoryEnd * 100) / 100,
      },
      scenario,
    });
  });
}

const SCENARIOS: Record<string, { iterations: number; delay: number; depth?: number; nodes?: number }> = {
  small: { iterations: 50, delay: 20 },
  medium: { iterations: 100, delay: 15 },
  large: { iterations: 100, delay: 10 },
  stress: { iterations: 500, delay: 10 },
  'stress-large-tree': { iterations: 50, delay: 50, depth: 3, nodes: 5 },
};

const PERFORMANCE_THRESHOLDS = {
  maxRenderTime: 16,
  avgRenderTime: 10,
  maxDiffTime: 5,
  avgDiffTime: 3,
  maxMemoryGrowthMB: 50,
};

export async function runBenchmark(scenarioName: string): Promise<void> {
  const scenario = SCENARIOS[scenarioName];
  if (!scenario) {
    console.error(`Unknown scenario: ${scenarioName}`);
    console.log('Available scenarios: small, medium, large, stress, stress-large-tree');
    process.exit(1);
  }

  console.log(`\n🧪 Running ${scenarioName} benchmark...\n`);

  const timeout = setTimeout(() => {
    console.log('\n⚠️  Benchmark timed out after 30 seconds\n');
    process.exit(1);
  }, 30000);

  let result: BenchmarkResult;

  if (scenarioName === 'stress-large-tree') {
    result = await runBenchmarkInternal(
      scenarioName,
      scenario.iterations,
      scenario.delay,
      scenario.depth,
      scenario.nodes
    );
  } else {
    result = await runBenchmarkInternal(scenarioName, scenario.iterations, scenario.delay);
  }

  clearTimeout(timeout);

  console.log('═══════════════════════════════════════');
  console.log('           BENCHMARK RESULTS           ');
  console.log('═══════════════════════════════════════\n');

  console.log(`Scenario: ${result.scenario}`);
  console.log(`Total Frames: ${result.totalFrames}\n`);

  console.log('Render Times:');
  console.log(`  Average: ${result.avgRenderTime}ms`);
  console.log(`  Max:     ${result.maxRenderTime}ms`);
  console.log(`  Min:     ${result.minRenderTime}ms\n`);

  console.log('Diff Times:');
  console.log(`  Average: ${result.avgDiffTime}ms`);
  console.log(`  Max:     ${result.maxDiffTime}ms\n`);

  console.log('Performance:');
  console.log(`  FPS: ${result.fps}\n`);

  console.log('Memory:');
  console.log(`  Start: ${result.memory.start}MB`);
  console.log(`  Peak:  ${result.memory.peak}MB`);
  console.log(`  End:   ${result.memory.end}MB`);
  console.log(`  Delta: ${Math.round((result.memory.end - result.memory.start) * 100) / 100}MB`);

  console.log('\n═══════════════════════════════════════');

  const warnings: string[] = [];

  if (result.avgRenderTime > PERFORMANCE_THRESHOLDS.avgRenderTime) {
    warnings.push(`⚠️  Average render time (${result.avgRenderTime}ms) exceeds threshold (${PERFORMANCE_THRESHOLDS.avgRenderTime}ms)`);
  }

  if (result.maxRenderTime > PERFORMANCE_THRESHOLDS.maxRenderTime) {
    warnings.push(`⚠️  Max render time (${result.maxRenderTime}ms) exceeds threshold (${PERFORMANCE_THRESHOLDS.maxRenderTime}ms)`);
  }

  if (result.avgDiffTime > PERFORMANCE_THRESHOLDS.avgDiffTime) {
    warnings.push(`⚠️  Average diff time (${result.avgDiffTime}ms) exceeds threshold (${PERFORMANCE_THRESHOLDS.avgDiffTime}ms)`);
  }

  const memoryGrowth = result.memory.end - result.memory.start;
  if (memoryGrowth > PERFORMANCE_THRESHOLDS.maxMemoryGrowthMB) {
    warnings.push(`⚠️  Memory growth (${Math.round(memoryGrowth * 100) / 100}MB) exceeds threshold (${PERFORMANCE_THRESHOLDS.maxMemoryGrowthMB}MB)`);
  }

  if (warnings.length > 0) {
    console.log('\nPerformance Warnings:');
    warnings.forEach(w => console.log('  ' + w));
  } else {
    console.log('\n✅ All performance thresholds passed!');
  }

  console.log('\n');
}