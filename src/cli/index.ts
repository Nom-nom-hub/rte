#!/usr/bin/env node

import { Command } from 'commander';
import { runDev } from './commands/dev.js';
import { runReplay } from './commands/replay.js';
import { runDiff } from './commands/diff.js';
import { runVerify } from './commands/verify.js';
import { runBenchmark } from './commands/benchmark.js';
import { setDebugMode, handleUserError } from './errorHandler.js';

const program = new Command();

program
  .name('rte')
  .description('React Terminal Engine - Terminal-based React rendering and debugging CLI')
  .version('1.0.0')
  .option('-d, --debug', 'Enable debug mode with stack traces for troubleshooting');

program.on('option:debug', () => {
  setDebugMode(true);
});

program
  .configureOutput({
    writeErr: (str) => {
      if (str.includes('error:')) {
        const match = str.match(/error: (.+)/);
        if (match) {
          const msg = match[1].replace(/'/g, '');
          handleUserError(formatCommanderError(msg));
        }
      }
    }
  });

function formatCommanderError(message: string): string {
  if (message.includes('missing required argument')) {
    const argMatch = message.match(/missing required argument '(\w+)'/);
    if (argMatch) {
      return `Missing required argument: ${argMatch[1]}`;
    }
  }
  if (message.includes('unknown option')) {
    const optMatch = message.match(/unknown option '(.+)'/);
    if (optMatch) {
      return `Unknown option: ${optMatch[1]}`;
    }
  }
  if (message.includes('too many arguments')) {
    return 'Too many arguments provided';
  }
  return message.charAt(0).toUpperCase() + message.slice(1);
}

program
  .command('dev <file>')
  .description('Run a React file through the engine with debug panel')
  .option('-p, --port <port>', 'API server port', '3000')
  .option('-s, --save-session', 'Save session to .rte/sessions/')
  .action((file, options) => {
    try {
      if (!file || file.startsWith('-')) {
        handleUserError('Missing required argument: file', 'Usage: rte dev <file>');
      }
      runDev(file, options);
    } catch (error) {
      handleUserError((error as Error).message || 'Failed to run dev command');
    }
  });

program
  .command('replay <sessionFile>')
  .description('Replay a recorded session with frame stepping')
  .option('-i, --interactive', 'Interactive mode with keyboard controls')
  .action((sessionFile, options) => {
    try {
      if (!sessionFile || sessionFile.startsWith('-')) {
        handleUserError('Missing required argument: sessionFile', 'Usage: rte replay <sessionFile>');
      }
      runReplay(sessionFile, options);
    } catch (error) {
      handleUserError((error as Error).message || 'Failed to run replay command');
    }
  });

program
  .command('diff <sessionA> <sessionB>')
  .description('Compare two session files and find divergence')
  .option('-v, --visual', 'Show visual side-by-side comparison')
  .option('-j, --json', 'Output structured debug summary as JSON')
  .option('-s, --summary-only', 'Print only explanation (no raw diff)')
  .action((sessionA, sessionB, options) => {
    try {
      if (!sessionA || sessionA.startsWith('-')) {
        handleUserError('Missing required argument: sessionA', 'Usage: rte diff <sessionA> <sessionB>');
      }
      if (!sessionB || sessionB.startsWith('-')) {
        handleUserError('Missing required argument: sessionB', 'Usage: rte diff <sessionA> <sessionB>');
      }
      runDiff(sessionA, sessionB, options);
    } catch (error) {
      handleUserError((error as Error).message || 'Failed to run diff command');
    }
  });

program
  .command('verify <snapshot.json>')
  .description('Verify current app state against snapshot (CI mode)')
  .option('-g, --generate', 'Generate and compare hash')
  .option('-e, --entry <file>', 'Entry file to run')
  .action((snapshotFile, options) => {
    try {
      if (!snapshotFile || snapshotFile.startsWith('-')) {
        handleUserError('Missing required argument: snapshotFile', 'Usage: rte verify <snapshot.json>');
      }
      runVerify(snapshotFile, options);
    } catch (error) {
      handleUserError((error as Error).message || 'Failed to run verify command');
    }
  });

program
  .command('benchmark')
  .description('Run performance benchmark')
  .option('-s, --scenario <name>', 'Benchmark scenario: small, medium, large, stress, stress-large-tree', 'small')
  .action((options) => {
    try {
      runBenchmark(options.scenario);
    } catch (error) {
      handleUserError((error as Error).message || 'Failed to run benchmark');
    }
  });

program.parse();