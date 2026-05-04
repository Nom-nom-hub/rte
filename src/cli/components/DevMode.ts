import { getFrameStore } from '../../deterministic/frameStore.js';
import { SessionManager, SessionFrame } from '../session/SessionManager.js';
import { TreeInspector } from './TreeInspector.js';
import { diffFrameBuffers, applyAnsiDiff } from '../../renderer/diff.js';
import { renderBufferToString } from '../utils/render.js';
import chalk from 'chalk';
import type { UpdateReason } from '../../deterministic/causality.js';

interface DevModeOptions {
  sessionManager: SessionManager;
  saveSession: boolean;
}

interface UIState {
  focusedPanel: 'ui' | 'debug';
  selectedTreePath: number[];
  expandedNodes: Set<string>;
}

export class DevMode {
  private sessionManager: SessionManager;
  private saveSession: boolean;
  private frameStore = getFrameStore();
  private treeInspector: TreeInspector;
  private uiState: UIState;
  private isRunning: boolean = false;
  private lastFrameHash: string = '';

  constructor(options: DevModeOptions) {
    this.sessionManager = options.sessionManager;
    this.saveSession = options.saveSession;
    this.treeInspector = new TreeInspector();
    this.uiState = {
      focusedPanel: 'ui',
      selectedTreePath: [],
      expandedNodes: new Set(),
    };
  }

  start(): void {
    this.isRunning = true;
    this.sessionManager.startNewSession('dev-session');
    this.enableInput();
    this.renderLoop();
  }

  stop(): void {
    this.isRunning = false;
    if (this.saveSession) {
      this.sessionManager.saveSession();
    }
    console.log('\x1b[0m\x1b[?25h');
  }

  private enableInput(): void {
    if (typeof process === 'undefined' || !process.stdin) return;

    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    const onData = (data: string) => {
      this.handleInput(data);
    };

    process.stdin.on('data', onData);

    const cleanup = () => {
      process.stdin?.setRawMode(false);
      process.stdin?.off('data', onData);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
  }

  private handleInput(data: string): void {
    if (this.uiState.focusedPanel === 'debug') {
      this.treeInspector.handleInput(data, this.uiState);
      this.render();
      return;
    }

    switch (data) {
      case '\t':
        this.uiState.focusedPanel = this.uiState.focusedPanel === 'ui' ? 'debug' : 'ui';
        this.render();
        break;
      case 'q':
      case '\u0003':
        this.stop();
        process.exit(0);
        break;
      case 's':
        if (this.saveSession) {
          this.sessionManager.saveSession();
        }
        break;
    }
  }

  private renderLoop(): void {
    if (!this.isRunning) return;

    const frame = this.frameStore.getLatestFrame();
    if (frame && frame.hash !== this.lastFrameHash) {
      this.lastFrameHash = frame.hash;
      this.sessionManager.addFrame(frame);
      this.render();
    }

    setTimeout(() => this.renderLoop(), 50);
  }

  private render(): void {
    const frame = this.frameStore.getLatestFrame();
    if (!frame) return;

    const uiWidth = Math.floor((process.stdout?.columns || 80) * 0.7);
    const debugWidth = Math.floor((process.stdout?.columns || 80) * 0.3);
    const height = (process.stdout?.rows || 24) - 2;

    const uiBuffer = frame.buffer.slice(0, height);
    const uiOutput = renderBufferToString(uiBuffer, uiWidth, height);

    const tree = frame.tree;
    const debugOutput = this.renderDebugPanel(tree, frame.hash, this.frameStore.size() - 1);

    console.clear();
    this.renderSplitScreen(uiOutput, debugOutput, uiWidth, debugWidth, height);
    this.renderStatusBar();
  }

  private renderSplitScreen(uiOutput: string, debugOutput: string[], uiWidth: number, debugWidth: number, height: number): void {
    const uiLines = uiOutput.length > 0 ? uiOutput.split('\n') : [];
    const debugLines = debugOutput;

    console.log('\x1b[2J\x1b[0;0H');
    console.log(chalk.cyan.bold('┌' + '─'.repeat(uiWidth) + '┬' + '─'.repeat(debugWidth) + '┐'));

    for (let i = 0; i < height; i++) {
      let line = '│';
      if (i < uiLines.length) {
        const truncated = uiLines[i].substring(0, uiWidth);
        line += truncated.padEnd(uiWidth);
      } else {
        line += ' '.repeat(uiWidth);
      }
      line += '│';
      if (i < debugLines.length) {
        line += debugLines[i].substring(0, debugWidth).padEnd(debugWidth);
      } else {
        line += ' '.repeat(debugWidth);
      }
      line += '│';
      console.log(line);
    }

    console.log(chalk.cyan.bold('└' + '─'.repeat(uiWidth) + '┴' + '─'.repeat(debugWidth) + '┘'));
  }

  private renderDebugPanel(tree: any, hash: string, frameIndex: number): string[] {
    const lines: string[] = [];
    const maxLines = (process.stdout?.rows || 24) - 4;

    lines.push(chalk.yellow('═'.repeat(20) + ' DEBUG PANEL ' + '═'.repeat(20)));
    lines.push(chalk.white(`Frame: ${chalk.green(String(frameIndex))}`));
    lines.push(chalk.white(`Hash: ${chalk.gray(hash)}`));
    lines.push(chalk.yellow('─'.repeat(44)));
    lines.push(chalk.cyan('▶ Component Tree'));

    const selectedPath = this.uiState.focusedPanel === 'debug'
      ? this.treeInspector.getSelectedPath()
      : [];

    const treeLines = this.treeInspector.renderTree(
      tree,
      this.uiState.expandedNodes,
      selectedPath,
      0,
      maxLines - 5
    );
    lines.push(...treeLines);

    if (this.uiState.focusedPanel === 'debug') {
      const selectedNode = this.treeInspector.getSelectedNode(tree, selectedPath);
      if (selectedNode) {
        lines.push(chalk.yellow('─'.repeat(44)));
        lines.push(chalk.cyan('▶ Node Details'));
        lines.push(chalk.white(`Type: ${chalk.green(selectedNode.type || 'unknown')}`));

        const frame = this.frameStore.getLatestFrame();
        const nodeId = this.treeInspector.getNodeId(selectedPath);
        if (nodeId && frame?.updates) {
          const nodeUpdates = frame.updates.filter(u => u.nodeId === nodeId);
          if (nodeUpdates.length > 0) {
            const lastUpdate = nodeUpdates[nodeUpdates.length - 1];
            lines.push(chalk.white('Update:'));

            const reasonText = this.formatUpdateReason(lastUpdate);
            lines.push(chalk.yellow('  ' + reasonText));

            if (lastUpdate.prevProps && lastUpdate.nextProps) {
              lines.push(chalk.gray('  Props diff:'));
              const propDiffs = this.getPropDiffs(lastUpdate.prevProps, lastUpdate.nextProps);
              for (const [key, { from, to }] of Object.entries(propDiffs)) {
                lines.push(chalk.white(`    ${key}: `) + chalk.red(String(from)) + chalk.white(' → ') + chalk.green(String(to)));
              }
            }

            const lastUpdateFrame = lastUpdate.frameIndex;
            const currentFrame = this.frameStore.size() - 1;
            const framesAgo = currentFrame - lastUpdateFrame;
            lines.push(chalk.gray(`  Updated ${framesAgo} frame${framesAgo !== 1 ? 's' : ''} ago`));
          }
        }

        if (selectedNode.props) {
          lines.push(chalk.white('Props:'));
          const propsStr = JSON.stringify(selectedNode.props, null, 2);
          const propLines = propsStr.split('\n').slice(0, 5);
          propLines.forEach(l => lines.push(chalk.gray('  ' + l)));
        }
      }
    }

    lines.push(chalk.gray('─'.repeat(44)));
    lines.push(chalk.gray('[Tab] Switch panel | [↑↓] Navigate | [Enter] Expand'));

    return lines;
  }

  private renderStatusBar(): void {
    const focus = this.uiState.focusedPanel === 'ui'
      ? chalk.green('UI')
      : chalk.yellow('DEBUG');
    console.log(chalk.gray(`\nFocus: ${focus} | [Tab] toggle | [q] quit | [s] save`));
  }

  private formatUpdateReason(update: UpdateReason): string {
    switch (update.reason) {
      case 'mount':
        return 'mounted (new node)';
      case 'props':
        return 'props changed';
      case 'state':
        return 'state changed';
      case 'parent':
        return 'parent re-rendered';
      default:
        return `updated (${update.reason})`;
    }
  }

  private getPropDiffs(prev: Record<string, unknown>, next: Record<string, unknown>): Record<string, { from: unknown; to: unknown }> {
    const diffs: Record<string, { from: unknown; to: unknown }> = {};
    const allKeys = new Set([...Object.keys(prev), ...Object.keys(next)]);

    for (const key of allKeys) {
      if (prev[key] !== next[key]) {
        diffs[key] = { from: prev[key], to: next[key] };
      }
    }

    return diffs;
  }
}