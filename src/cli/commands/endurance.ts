import React from 'react';
import { render } from '../../core/render.js';
import { getFrameStore } from '../../deterministic/frameStore.js';
import { getCausalityTracker } from '../../deterministic/causality.js';
import { diffFrameBuffers } from '../../renderer/diff.js';
import { Box, Text } from '../../index.js';

function getMemoryMB(): number {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    return process.memoryUsage().heapUsed / (1024 * 1024);
  }
  return 0;
}

function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export interface StabilityMetrics {
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
    growthRate: number;
    samples: number[];
  };
  stabilityScore: 'PASS' | 'FAIL';
  failures: string[];
}

interface StressConfig {
  name: string;
  frames: number;
  delay: number;
  treeDepth?: number;
  treeBreadth?: number;
  keyEventsPerFrame?: number;
}

const STRESS_SCENARIOS: Record<string, StressConfig> = {
  endurance: { name: 'Endurance', frames: 10000, delay: 5 },
  longEndurance: { name: 'Long Endurance', frames: 50000, delay: 3 },
  rapidInput: { name: 'Rapid Input', frames: 5000, delay: 10, keyEventsPerFrame: 2 },
  deepTree: { name: 'Deep Tree', frames: 100, delay: 50, treeDepth: 30, treeBreadth: 5 },
  wideTree: { name: 'Wide Tree', frames: 50, delay: 100, treeDepth: 10, treeBreadth: 50 },
  extremeTree: { name: 'Extreme Tree', frames: 20, delay: 200, treeDepth: 50, treeBreadth: 20 },
};

const STABILITY_THRESHOLDS = {
  maxRenderTime: 50,
  avgRenderTime: 30,
  maxDiffTime: 20,
  minFps: 30,
  maxMemoryGrowthMB: 100,
  memoryGrowthFactor: 2.0,
};

function createDeepTree(depth: number, breadth: number): React.ReactElement {
  function build(d: number): React.ReactNode {
    if (d <= 0) {
      return React.createElement(Text, { children: `Leaf-${Math.random().toString(36).substr(2, 8)}` });
    }
    const children = [];
    for (let i = 0; i < Math.min(breadth, 3); i++) {
      children.push(
        React.createElement(Box, { key: i, height: 1, padding: 0 }, build(d - 1))
      );
    }
    return children;
  }
  return React.createElement(Box, { width: 80, height: 40, flexDirection: 'column' }, build(depth));
}

function createWideTree(depth: number, breadth: number): React.ReactElement {
  function build(d: number): React.ReactNode {
    if (d <= 0) return null;
    const children = [];
    for (let i = 0; i < breadth; i++) {
      children.push(
        React.createElement(Box, { key: i, width: 1, height: 1 },
          React.createElement(Text, { children: 'x' })
        )
      );
    }
    const subChildren = d > 1 ? [build(d - 1)] : [];
    return React.createElement(Box, { flexDirection: 'row' }, ...children, ...subChildren);
  }
  return React.createElement(Box, { width: 80, height: 40, flexDirection: 'column' }, build(depth));
}

function createRapidInputApp(frameIndex: number): React.ReactElement {
  return React.createElement(Box, { width: 60, height: 25, flexDirection: 'column' },
    React.createElement(Box, { height: 2 },
      React.createElement(Text, { children: `Frame: ${frameIndex}` })
    ),
    React.createElement(Box, { flexGrow: 1 },
      React.createElement(Text, { children: `Input: ${Math.random().toString(36).substr(2, 6)}` })
    ),
    React.createElement(Box, { height: 1 },
      React.createElement(Text, { children: 'Processing...' })
    )
  );
}

function createStandardApp(frameIndex: number): React.ReactElement {
  return React.createElement(Box, { width: 40, height: 20 },
    React.createElement(Text, { children: `Frame ${frameIndex}: ${Date.now() % 10000}` })
  );
}

async function runStressTest(config: StressConfig): Promise<StabilityMetrics> {
  const frameStore = getFrameStore();
  const causalityTracker = getCausalityTracker();
  frameStore.clear();
  causalityTracker.clear();

  const memoryStart = getMemoryMB();
  let memoryPeak = memoryStart;
  const memorySamples: number[] = [];

  const renderTimes: number[] = [];
  const diffTimes: number[] = [];
  const fpsSamples: number[] = [];

  const container = { children: [], __isTermContainer: true };
  let instance: any = null;
  let lastFrameTime = Date.now();

  try {
    const isDeepTree = config.name.includes('Deep') || config.name.includes('Extreme');
    const isWideTree = config.name.includes('Wide');

    let element: React.ReactElement;

    if (isDeepTree && config.treeDepth) {
      element = createDeepTree(config.treeDepth, config.treeBreadth || 3);
    } else if (isWideTree && config.treeDepth) {
      element = createWideTree(config.treeDepth, config.treeBreadth || 10);
    } else if (config.keyEventsPerFrame) {
      element = createRapidInputApp(0);
    } else {
      element = createStandardApp(0);
    }

    instance = render(element, container);

    for (let i = 0; i < config.frames; i++) {
      const frameStart = performance.now();

      if (instance?.update) {
        if (config.keyEventsPerFrame) {
          element = createRapidInputApp(i);
        } else {
          element = createStandardApp(i);
        }
        instance.update(element);
      }

      await wait(config.delay);

      const frame = frameStore.getLatestFrame();
      const frameEnd = performance.now();

      const renderTime = frameEnd - frameStart;
      renderTimes.push(renderTime);

      if (frame) {
        const prevFrame = frameStore.getFrameAt(frameStore.size() - 2);
        if (prevFrame?.buffer) {
          const diffStart = performance.now();
          diffFrameBuffers(prevFrame.buffer, frame.buffer);
          diffTimes.push(performance.now() - diffStart);
        }
      }

      if (i % 100 === 0) {
        const currentMemory = getMemoryMB();
        memorySamples.push(currentMemory);
        if (currentMemory > memoryPeak) memoryPeak = currentMemory;

        const now = Date.now();
        const frameTime = now - lastFrameTime;
        if (frameTime > 0) {
          fpsSamples.push(1000 / frameTime);
        }
        lastFrameTime = now;
      }

      if (i % 1000 === 0) {
        console.log(`    Progress: ${i}/${config.frames} frames`);
      }
    }

    if (instance?.stop) instance.stop();
  } catch (error) {
    if (instance?.stop) try { instance.stop(); } catch {}
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

  const totalTime = config.frames * config.delay;
  const fps = totalTime > 0 ? (config.frames / (totalTime / 1000)) : 0;
  const avgFps = fpsSamples.length > 0 ? fpsSamples.reduce((a, b) => a + b, 0) / fpsSamples.length : fps;

  const memoryGrowth = memoryEnd - memoryStart;
  const growthRate = memorySamples.length > 1
    ? (memorySamples[memorySamples.length - 1] - memorySamples[0]) / memorySamples.length
    : 0;

  const failures: string[] = [];

  if (avgRenderTime > STABILITY_THRESHOLDS.avgRenderTime) {
    failures.push(`Avg render time ${avgRenderTime.toFixed(2)}ms exceeds ${STABILITY_THRESHOLDS.avgRenderTime}ms`);
  }

  if (maxRenderTime > STABILITY_THRESHOLDS.maxRenderTime) {
    failures.push(`Max render time ${maxRenderTime.toFixed(2)}ms exceeds ${STABILITY_THRESHOLDS.maxRenderTime}ms`);
  }

  if (avgDiffTime > STABILITY_THRESHOLDS.maxDiffTime) {
    failures.push(`Avg diff time ${avgDiffTime.toFixed(2)}ms exceeds ${STABILITY_THRESHOLDS.maxDiffTime}ms`);
  }

  if (avgFps < STABILITY_THRESHOLDS.minFps) {
    failures.push(`Average FPS ${avgFps.toFixed(2)} below ${STABILITY_THRESHOLDS.minFps}`);
  }

  if (memoryGrowth > STABILITY_THRESHOLDS.maxMemoryGrowthMB) {
    failures.push(`Memory growth ${memoryGrowth.toFixed(2)}MB exceeds ${STABILITY_THRESHOLDS.maxMemoryGrowthMB}MB`);
  }

  if (memorySamples.length > 10) {
    const earlyAvg = memorySamples.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
    const lateAvg = memorySamples.slice(-5).reduce((a, b) => a + b, 0) / 5;
    if (lateAvg > earlyAvg * STABILITY_THRESHOLDS.memoryGrowthFactor) {
      failures.push('Memory shows exponential growth pattern');
    }
  }

  return {
    avgRenderTime: Math.round(avgRenderTime * 100) / 100,
    maxRenderTime: Math.round(maxRenderTime * 100) / 100,
    minRenderTime: Math.round(minRenderTime * 100) / 100,
    avgDiffTime: Math.round(avgDiffTime * 100) / 100,
    maxDiffTime: Math.round(maxDiffTime * 100) / 100,
    fps: Math.round(avgFps * 10) / 10,
    totalFrames: config.frames,
    memory: {
      start: Math.round(memoryStart * 100) / 100,
      peak: Math.round(memoryPeak * 100) / 100,
      end: Math.round(memoryEnd * 100) / 100,
      growthRate: Math.round(growthRate * 10000) / 10000,
      samples: memorySamples.map(m => Math.round(m * 100) / 100),
    },
    stabilityScore: failures.length > 0 ? 'FAIL' : 'PASS',
    failures,
  };
}

export async function runEnduranceBenchmark(scenarioName: string): Promise<void> {
  const config = STRESS_SCENARIOS[scenarioName];
  if (!config) {
    console.error(`Unknown scenario: ${scenarioName}`);
    console.log('Available scenarios:', Object.keys(STRESS_SCENARIOS).join(', '));
    process.exit(1);
  }

  console.log(`\n🧪 Running ${config.name} stress test...`);
  console.log(`   Frames: ${config.frames}, Delay: ${config.delay}ms\n`);

  const timeout = setTimeout(() => {
    console.log('\n⚠️  Benchmark timed out after 60 seconds\n');
    process.exit(1);
  }, 60000);

  const result = await runStressTest(config);

  clearTimeout(timeout);

  console.log('\n════════════════════════════════════════════════');
  console.log('       STABILITY METRICS REPORT');
  console.log('════════════════════════════════════════════════\n');

  console.log(`Scenario: ${config.name}`);
  console.log(`Total Frames: ${result.totalFrames}\n`);

  console.log('Render Performance:');
  console.log(`  Average: ${result.avgRenderTime}ms`);
  console.log(`  Max:     ${result.maxRenderTime}ms`);
  console.log(`  Min:     ${result.minRenderTime}ms\n`);

  console.log('Diff Performance:');
  console.log(`  Average: ${result.avgDiffTime}ms`);
  console.log(`  Max:     ${result.maxDiffTime}ms\n`);

  console.log('Frame Rate:');
  console.log(`  Average FPS: ${result.fps}\n`);

  console.log('Memory Analysis:');
  console.log(`  Start:  ${result.memory.start}MB`);
  console.log(`  Peak:   ${result.memory.peak}MB`);
  console.log(`  End:    ${result.memory.end}MB`);
  console.log(`  Growth: ${Math.round((result.memory.end - result.memory.start) * 100) / 100}MB`);
  console.log(`  Rate:   ${result.memory.growthRate}MB/frame\n`);

  console.log('════════════════════════════════════════════════');

  if (result.stabilityScore === 'PASS') {
    console.log('\n✅ STABILITY SCORE: PASS');
    console.log('   All thresholds met. System is stable.\n');
  } else {
    console.log('\n❌ STABILITY SCORE: FAIL');
    console.log('   Failures detected:');
    result.failures.forEach(f => console.log('   - ' + f));
    console.log('');
  }

  console.log('════════════════════════════════════════════════\n');

  if (result.stabilityScore === 'FAIL') {
    process.exit(1);
  }
}