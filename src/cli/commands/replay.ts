import fs from 'fs';
import path from 'path';
import { SessionManager, Session } from '../session/SessionManager.js';
import { diffFrameBuffers, applyAnsiDiff } from '../../renderer/diff.js';
import { renderBufferToString } from '../utils/render.js';
import chalk from 'chalk';
import { safeJSONParse, handleUserError } from '../errorHandler.js';

export async function runReplay(sessionFile: string, options: { interactive: boolean }) {
  const filepath = path.isAbsolute(sessionFile) ? sessionFile : path.resolve(process.cwd(), sessionFile);

  if (!fs.existsSync(filepath)) {
    handleUserError(`Session file not found: ${filepath}`, 'Check that the file path is correct');
  }

  const content = fs.readFileSync(filepath, 'utf-8');
  const session = safeJSONParse<Session>(content, 'session file');

  console.log('\x1b[2J\x1b[0;H');
  console.log(chalk.cyan('React Terminal Engine - Replay Mode'));
  console.log(chalk.gray(`Session: ${session.filename}`));
  console.log(chalk.gray(`Frames: ${session.frames.length}`));
  console.log(chalk.gray(`Created: ${new Date(session.metadata?.createdAt || Date.now()).toISOString()}\n`));

  if (options.interactive) {
    await runInteractiveReplay(session);
  } else {
    runNonInteractiveReplay(session);
  }
}

function runNonInteractiveReplay(session: Session): void {
  console.log('Playing all frames...\n');

  for (let i = 0; i < session.frames.length; i++) {
    const frame = session.frames[i];
    console.clear();
    console.log(chalk.cyan(`Frame ${i + 1}/${session.frames.length} | Hash: ${frame.hash}`));

    const uiWidth = Math.floor((process.stdout?.columns || 80) * 0.7);
    const height = (process.stdout?.rows || 24) - 4;

    const buffer = frame.buffer.slice(0, height);
    const output = renderBufferToString(buffer, uiWidth, height);
    console.log(output);

    if (i < session.frames.length - 1) {
      const nextFrame = session.frames[i + 1];
      const diffs = diffFrameBuffers(frame.buffer, nextFrame.buffer);
      const diffOutput = applyAnsiDiff(diffs);

      console.log(chalk.gray('\nDiff from previous frame:'));
      console.log(chalk.red(`  +${diffs.filter(d => d.char !== ' ').length} changed cells`));
    }

    const delay = 100;
    const start = Date.now();
    while (Date.now() - start < delay) {}
  }

  console.log(chalk.green('\nReplay complete!'));
  process.exit(0);
}

async function runInteractiveReplay(session: Session): Promise<void> {
  const sessionManager = new SessionManager();
  (sessionManager as any).currentSession = session;

  let currentIndex = 0;

  const renderFrame = (index: number) => {
    const frame = session.frames[index];
    if (!frame) return;

    console.clear();

    const uiWidth = Math.floor((process.stdout?.columns || 80) * 0.7);
    const debugWidth = Math.floor((process.stdout?.columns || 80) * 0.3);
    const height = (process.stdout?.rows || 24) - 4;

    const buffer = frame.buffer.slice(0, height);
    const uiOutput = renderBufferToString(buffer, uiWidth, height);
    const uiLines = uiOutput.length > 0 ? uiOutput.split('\n') : [];

    console.log(chalk.cyan.bold('┌' + '─'.repeat(uiWidth) + '┬' + '─'.repeat(debugWidth) + '┐'));

    for (let i = 0; i < height; i++) {
      let line = '│';
      if (i < uiLines.length) {
        line += uiLines[i].padEnd(uiWidth).substring(0, uiWidth);
      } else {
        line += ' '.repeat(uiWidth);
      }
      line += '│';
      line += ' '.repeat(debugWidth);
      line += '│';
      console.log(line);
    }

    console.log(chalk.cyan.bold('└' + '─'.repeat(uiWidth) + '┴' + '─'.repeat(debugWidth) + '┘'));

    console.log(chalk.gray(`\nFrame: ${index + 1}/${session.frames.length} | Hash: ${frame.hash}`));
    console.log(chalk.gray('[←] Prev | [→] Next | [g] Go to | [q] Quit'));
  };

  renderFrame(currentIndex);

  if (typeof process === 'undefined' || !process.stdin) {
    console.log('Interactive mode requires a TTY');
    return;
  }

  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding('utf8');

  const onData = (data: string) => {
    switch (data) {
      case '\x1b[C':
        if (currentIndex < session.frames.length - 1) {
          currentIndex++;
          renderFrame(currentIndex);
        }
        break;
      case '\x1b[D':
        if (currentIndex > 0) {
          currentIndex--;
          renderFrame(currentIndex);
        }
        break;
      case 'g':
        console.log('\nEnter frame index:');
        break;
      case 'q':
      case '\u0003':
        process.stdin?.setRawMode(false);
        process.exit(0);
        break;
    }
  };

  process.stdin.on('data', onData);

  process.on('SIGINT', () => {
    process.stdin?.setRawMode(false);
    process.exit(0);
  });
}