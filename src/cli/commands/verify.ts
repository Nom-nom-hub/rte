import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { safeJSONParse, handleUserError } from '../errorHandler.js';

interface Snapshot {
  hash: string;
  timestamp: number;
  tree: any;
  buffer: any;
  dimensions: {
    rows: number;
    cols: number;
  };
}

export async function runVerify(snapshotFile: string, options: { generate: boolean; entry?: string }) {
  const filepath = path.isAbsolute(snapshotFile) ? snapshotFile : path.resolve(process.cwd(), snapshotFile);

  if (!fs.existsSync(filepath)) {
    handleUserError(`Snapshot file not found: ${filepath}`, 'Check that the file path is correct');
  }

  const content = fs.readFileSync(filepath, 'utf-8');
  const snapshot = safeJSONParse<Snapshot>(content, 'snapshot file');

  console.log('\n');
  console.log(chalk.cyan.bold('═'.repeat(50)));
  console.log(chalk.cyan.bold('  React Terminal Engine - Verify'));
  console.log(chalk.cyan.bold('═'.repeat(50)));
  console.log();

  console.log(chalk.white('Snapshot: ') + chalk.gray(filepath));
  console.log(chalk.white('  Expected hash: ') + chalk.yellow(snapshot.hash));
  console.log(chalk.white('  Dimensions: ') + chalk.gray(`${snapshot.dimensions.cols}x${snapshot.dimensions.rows}`));
  console.log(chalk.white('  Created: ') + chalk.gray(new Date(snapshot.timestamp).toISOString()));
  console.log();

  if (options.generate) {
    await generateAndCompare(snapshot, options.entry);
  } else {
    console.log(chalk.yellow('  Use --generate to run the app and compare'));
    console.log();
    process.exit(1);
  }
}

async function generateAndCompare(snapshot: Snapshot, entryFile?: string): Promise<void> {
  console.log(chalk.white('Running app to generate current state...\n'));

  const { render } = await import('../../core/render.js');
  const { getFrameStore } = await import('../../deterministic/frameStore.js');
  const React = await import('react');

  let AppComponent: any = null;

  if (entryFile) {
    const absolutePath = path.isAbsolute(entryFile) ? entryFile : path.resolve(process.cwd(), entryFile);
    if (fs.existsSync(absolutePath)) {
      const module = await import(absolutePath);
      AppComponent = module.default || module.App || module;
    }
  }

  if (!AppComponent) {
    const examplesDir = path.join(process.cwd(), 'examples');
    if (fs.existsSync(examplesDir)) {
      const files = fs.readdirSync(examplesDir).filter(f => f.endsWith('.tsx') || f.endsWith('.ts'));
      if (files.length > 0) {
        const module = await import(path.join(examplesDir, files[0]));
        AppComponent = module.default || module.App || module;
      }
    }
  }

  if (!AppComponent) {
    console.log(chalk.red('Error: Could not find app entry point'));
    console.log(chalk.gray('Usage: rte verify <snapshot.json> --entry <file.tsx>'));
    process.exit(1);
  }

  const rootContainer = {
    children: [],
    __isTermContainer: true,
  };

  const instance = render(React.createElement(AppComponent), rootContainer);

  await new Promise(resolve => setTimeout(resolve, 500));

  const frameStore = getFrameStore();
  const currentFrame = frameStore.getLatestFrame();

  instance.stop();

  if (!currentFrame) {
    console.log(chalk.red('Error: No frame generated'));
    process.exit(1);
  }

  const actualHash = currentFrame.hash;

  console.log(chalk.white('  Actual hash:   ') + (actualHash === snapshot.hash ? chalk.green(actualHash) : chalk.red(actualHash)));
  console.log();

  if (actualHash === snapshot.hash) {
    console.log(chalk.green.bold('  ✓ Hash matches - deterministic validation passed'));
    console.log();
    process.exit(0);
  } else {
    console.log(chalk.red.bold('  ✗ Hash mismatch - behavior has changed'));
    console.log();

    if (currentFrame.tree && snapshot.tree) {
      console.log(chalk.cyan('  Tree comparison:'));

      const treeChanges = compareTreeStructure(snapshot.tree, currentFrame.tree);
      if (treeChanges.added.length > 0) {
        console.log(chalk.green('    Added: ') + treeChanges.added.slice(0, 3).join(', ') + (treeChanges.added.length > 3 ? '...' : ''));
      }
      if (treeChanges.removed.length > 0) {
        console.log(chalk.red('    Removed: ') + treeChanges.removed.slice(0, 3).join(', ') + (treeChanges.removed.length > 3 ? '...' : ''));
      }
      if (treeChanges.changed.length > 0) {
        console.log(chalk.yellow('    Changed: ') + treeChanges.changed.slice(0, 3).join(', ') + (treeChanges.changed.length > 3 ? '...' : ''));
      }
      console.log();
    }

    console.log(chalk.gray('─'.repeat(50)));
    process.exit(1);
  }
}

function compareTreeStructure(treeA: any, treeB: any): { added: string[]; removed: string[]; changed: string[] } {
  const result = { added: [] as string[], removed: [] as string[], changed: [] as string[] };

  const nodesA = collectNodes(treeA);
  const nodesB = collectNodes(treeB);

  const labelsA = new Set(nodesA.map((n: any) => n.label));
  const labelsB = new Set(nodesB.map((n: any) => n.label));

  for (const label of labelsB) {
    if (!labelsA.has(label)) {
      result.added.push(label);
    }
  }

  for (const label of labelsA) {
    if (!labelsB.has(label)) {
      result.removed.push(label);
    }
  }

  return result;
}

function collectNodes(tree: any): any[] {
  const nodes: any[] = [];

  if (!tree) return nodes;

  const label = tree.type || 'node';
  nodes.push({ label });

  if (tree.children) {
    for (const child of tree.children) {
      nodes.push(...collectNodes(child));
    }
  }

  return nodes;
}