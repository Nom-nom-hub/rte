import fs from 'fs';
import path from 'path';
import { Session, SessionFrame } from '../session/SessionManager.js';
import chalk from 'chalk';
import { diffFrameBuffers } from '../../renderer/diff.js';
import { renderBufferToString, renderDiff, renderWithHighlights } from '../utils/render.js';
import { computeTreeDiff } from '../utils/treeDiff.js';
import { analyzeDivergence, printDebugSummary, type DebugSummary } from '../utils/debugInsights.js';
import { extractNodePositions, getHighlightPositions } from '../utils/nodePositions.js';
import { safeJSONParse, handleUserError } from '../errorHandler.js';

interface DiffOptions {
  visual: boolean;
  json: boolean;
  summaryOnly: boolean;
}

interface DivergenceResult {
  frameIndex: number;
  frameA: SessionFrame | null;
  frameB: SessionFrame | null;
  treeDiff: { addedNodes: string[]; removedNodes: string[]; updatedNodes: string[] } | null;
  bufferDiff: { changedCells: number } | null;
  debugSummary: DebugSummary | null;
}

export async function runDiff(sessionFileA: string, sessionFileB: string, options: DiffOptions) {
  const filepathA = path.isAbsolute(sessionFileA) ? sessionFileA : path.resolve(process.cwd(), sessionFileA);
  const filepathB = path.isAbsolute(sessionFileB) ? sessionFileB : path.resolve(process.cwd(), sessionFileB);

  if (!fs.existsSync(filepathA)) {
    handleUserError(`Session file not found: ${filepathA}`, 'Check that the file path is correct');
  }

  if (!fs.existsSync(filepathB)) {
    handleUserError(`Session file not found: ${filepathB}`, 'Check that the file path is correct');
  }

  const contentA = fs.readFileSync(filepathA, 'utf-8');
  const contentB = fs.readFileSync(filepathB, 'utf-8');

  const sessionA = safeJSONParse<Session>(contentA, 'session file A');
  const sessionB = safeJSONParse<Session>(contentB, 'session file B');

  console.log('\n');
  console.log(chalk.cyan.bold('═'.repeat(60)));
  console.log(chalk.cyan.bold('  React Terminal Engine - Session Comparison'));
  console.log(chalk.cyan.bold('═'.repeat(60)));
  console.log();

  console.log(chalk.white('Session A: ') + chalk.gray(filepathA));
  console.log(chalk.white('  Frames: ') + chalk.green(String(sessionA.frames.length)));
  console.log(chalk.white('  Created: ') + chalk.gray(new Date(sessionA.metadata?.createdAt || Date.now()).toISOString()));
  console.log();

  console.log(chalk.white('Session B: ') + chalk.gray(filepathB));
  console.log(chalk.white('  Frames: ') + chalk.green(String(sessionB.frames.length)));
  console.log(chalk.white('  Created: ') + chalk.gray(new Date(sessionB.metadata?.createdAt || Date.now()).toISOString()));
  console.log();

  const divergenceResult = findFirstDivergence(sessionA, sessionB);

  if (divergenceResult.debugSummary) {
    printDebugSummary(divergenceResult.debugSummary, options);
  }

  if (options.json) {
    process.exit(divergenceResult.frameIndex === -1 ? 0 : 1);
  }

  if (options.summaryOnly) {
    process.exit(divergenceResult.frameIndex === -1 ? 0 : 1);
  }

  console.log(chalk.yellow.bold('─'.repeat(60)));
  console.log(chalk.yellow('  Divergence Analysis'));
  console.log(chalk.yellow.bold('─'.repeat(60)));
  console.log();

  if (divergenceResult.frameIndex === -1) {
    console.log(chalk.green.bold('  ✓ No divergence found - sessions are identical'));
    process.exit(0);
  }

  console.log(chalk.white('  First divergent frame: ') + chalk.red.bold(String(divergenceResult.frameIndex)));
  console.log(chalk.white('  Session A hash: ') + chalk.gray(divergenceResult.frameA?.hash || 'N/A'));
  console.log(chalk.white('  Session B hash: ') + chalk.gray(divergenceResult.frameB?.hash || 'N/A'));
  console.log();

  if (divergenceResult.treeDiff) {
    console.log(chalk.cyan.bold('  Tree Diff (frame ') + String(divergenceResult.frameIndex) + '):');
    console.log();

    if (divergenceResult.treeDiff.addedNodes.length > 0) {
      console.log(chalk.green('    Added nodes:'));
      for (const node of divergenceResult.treeDiff.addedNodes.slice(0, 5)) {
        console.log(chalk.green('      + ') + chalk.white(node));
      }
      if (divergenceResult.treeDiff.addedNodes.length > 5) {
        console.log(chalk.green('      ... and ') + String(divergenceResult.treeDiff.addedNodes.length - 5) + ' more');
      }
    }

    if (divergenceResult.treeDiff.removedNodes.length > 0) {
      console.log(chalk.red('    Removed nodes:'));
      for (const node of divergenceResult.treeDiff.removedNodes.slice(0, 5)) {
        console.log(chalk.red('      - ') + chalk.white(node));
      }
      if (divergenceResult.treeDiff.removedNodes.length > 5) {
        console.log(chalk.red('      ... and ') + String(divergenceResult.treeDiff.removedNodes.length - 5) + ' more');
      }
    }

    if (divergenceResult.treeDiff.updatedNodes.length > 0) {
      console.log(chalk.yellow('    Updated nodes:'));
      for (const node of divergenceResult.treeDiff.updatedNodes.slice(0, 5)) {
        console.log(chalk.yellow('      ~ ') + chalk.white(node));
      }
      if (divergenceResult.treeDiff.updatedNodes.length > 5) {
        console.log(chalk.yellow('      ... and ') + String(divergenceResult.treeDiff.updatedNodes.length - 5) + ' more');
      }
    }
    console.log();
  }

  if (divergenceResult.bufferDiff) {
    console.log(chalk.cyan.bold('  Buffer Diff:'));
    console.log(chalk.white('    Changed cells: ') + chalk.red(String(divergenceResult.bufferDiff.changedCells)));
    console.log();
  }

  if (options.visual) {
    console.log(chalk.cyan.bold('─'.repeat(60)));
    console.log(chalk.cyan('  Visual Comparison'));
    console.log(chalk.cyan.bold('─'.repeat(60)));
    console.log();

    if (divergenceResult.frameA && divergenceResult.frameB) {
      const uiWidth = Math.floor((process.stdout?.columns || 80) * 0.45);
      const height = (process.stdout?.rows || 24) - 15;

      console.log(chalk.white('Session A (frame ') + String(divergenceResult.frameIndex) + '):');
      const outputA = renderBufferToString(divergenceResult.frameA.buffer.slice(0, height), uiWidth, height);
      console.log(outputA);

      console.log();
      console.log(chalk.white('Session B (frame ') + String(divergenceResult.frameIndex) + '):');

      let outputB: string;
      if (divergenceResult.debugSummary?.rootCause) {
        const nodePositions = extractNodePositions(divergenceResult.frameB.tree);
        const highlightConfig = getHighlightPositions(
          divergenceResult.debugSummary.rootCause.nodeId,
          divergenceResult.debugSummary.impact.affectedNodeIds,
          nodePositions
        );
        outputB = renderWithHighlights(
          divergenceResult.frameB.buffer.slice(0, height),
          uiWidth,
          height,
          highlightConfig
        );
        console.log(outputB);
        console.log();
        console.log(chalk.red('  █ Root cause') + chalk.gray(' | ') + chalk.yellow('█ Impacted'));
      } else {
        outputB = renderBufferToString(divergenceResult.frameB.buffer.slice(0, height), uiWidth, height);
        console.log(outputB);
      }
    }
  }

  console.log();
  console.log(chalk.gray('─'.repeat(60)));

  process.exit(1);
}

function findFirstDivergence(sessionA: Session, sessionB: Session): DivergenceResult {
  const maxFrames = Math.max(sessionA.frames.length, sessionB.frames.length);

  for (let i = 0; i < maxFrames; i++) {
    const frameA = sessionA.frames[i];
    const frameB = sessionB.frames[i];

    if (!frameA || !frameB) {
      return {
        frameIndex: i,
        frameA: frameA || null,
        frameB: frameB || null,
        treeDiff: null,
        bufferDiff: null,
        debugSummary: null,
      };
    }

    if (frameA.hash !== frameB.hash) {
      const treeDiff = computeTreeDiff(frameA.tree, frameB.tree);

      let changedCells = 0;
      if (frameA.buffer && frameB.buffer) {
        const diffs = diffFrameBuffers(frameA.buffer, frameB.buffer);
        changedCells = diffs.length;
      }

      const debugSummary = analyzeDivergence(i, frameA, frameB, treeDiff);

      return {
        frameIndex: i,
        frameA,
        frameB,
        treeDiff,
        bufferDiff: { changedCells },
        debugSummary,
      };
    }
  }

  return {
    frameIndex: -1,
    frameA: null,
    frameB: null,
    treeDiff: null,
    bufferDiff: null,
    debugSummary: null,
  };
}