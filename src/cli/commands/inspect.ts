import { getFrameStore } from '../../deterministic/frameStore.js';
import chalk from 'chalk';

export async function runInspect(options: { frame: string }) {
  const frameStore = getFrameStore();
  const frameIndex = options.frame ? parseInt(options.frame, 10) : -1;

  let frame;
  if (frameIndex >= 0) {
    frame = frameStore.getFrameAt(frameIndex);
  } else {
    frame = frameStore.getLatestFrame();
  }

  if (!frame) {
    console.error('Error: No frame available');
    process.exit(1);
  }

  console.clear();
  console.log(chalk.cyan.bold('═'.repeat(50)));
  console.log(chalk.cyan.bold('  React Terminal Engine - Tree Inspector'));
  console.log(chalk.cyan.bold('═'.repeat(50)));
  console.log();

  const targetFrameIndex = frameIndex >= 0 ? frameIndex : frameStore.size() - 1;
  console.log(chalk.white(`Inspecting Frame: ${chalk.green(String(targetFrameIndex))}`));
  console.log(chalk.white(`Hash: ${chalk.gray(frame.hash)}`));
  console.log(chalk.white(`Buffer Size: ${frame.buffer.length}x${frame.buffer[0]?.length || 0}`));
  console.log();

  console.log(chalk.yellow('Component Tree:'));
  console.log(chalk.yellow('─'.repeat(50)));

  const tree = frame.tree;
  const lines = renderTreeInteractive(tree, 0, 0);

  lines.forEach((line, i) => {
    console.log(line);
  });

  console.log();
  console.log(chalk.gray('─'.repeat(50)));
  console.log(chalk.gray('Press [Enter] to explore, [q] to quit'));

  if (typeof process !== 'undefined' && process.stdin) {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    const onData = (data: string) => {
      if (data === 'q' || data === '\u0003') {
        process.stdin?.setRawMode(false);
        process.exit(0);
      }
    };

    process.stdin.on('data', onData);
    process.on('SIGINT', () => {
      process.stdin?.setRawMode(false);
      process.exit(0);
    });
  }
}

function renderTreeInteractive(tree: any, depth: number, index: number): string[] {
  const lines: string[] = [];
  const prefix = '  '.repeat(depth);
  const typeStr = tree.type || 'unknown';
  const hasChildren = tree.children && tree.children.length > 0;

  let label = typeStr;
  if (tree.props) {
    if (tree.props.label) label += `: "${tree.props.label}"`;
    else if (tree.props.children) label += `: ${String(tree.props.children).substring(0, 30)}`;
  }

  const line = prefix + (hasChildren ? '▼ ' : '  ') + chalk.white(label);
  lines.push(line);

  if (hasChildren) {
    let childIndex = 0;
    for (const child of tree.children) {
      const childLines = renderTreeInteractive(child, depth + 1, index + childIndex + 1);
      lines.push(...childLines);
      childIndex++;
    }
  }

  return lines;
}