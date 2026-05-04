import chalk from 'chalk';
import { Cell } from '../../renderer/frameBuffer.js';

function applyStyle(cell: Cell): string {
  let char = cell.char || ' ';

  if (!cell.style) {
    return char;
  }

  try {
    const style = JSON.parse(cell.style);

    if (style._color) {
      const colorMap: Record<string, chalk.Chalk> = {
        red: chalk.red,
        green: chalk.green,
        yellow: chalk.yellow,
        blue: chalk.blue,
        magenta: chalk.magenta,
        cyan: chalk.cyan,
        white: chalk.white,
        gray: chalk.gray,
        grey: chalk.gray,
      };
      const colorFn = colorMap[style._color];
      if (colorFn) {
        char = colorFn(char);
      }
    }

    if (style._bg) {
      const bgMap: Record<string, chalk.Chalk> = {
        red: chalk.bgRed,
        green: chalk.bgGreen,
        yellow: chalk.bgYellow,
        blue: chalk.bgBlue,
        magenta: chalk.bgMagenta,
        cyan: chalk.bgCyan,
        white: chalk.bgWhite,
        gray: chalk.bgGray,
        grey: chalk.bgGray,
      };
      const bgFn = bgMap[style._bg];
      if (bgFn) {
        char = bgFn(char);
      }
    }
  } catch (e) {
  }

  return char;
}

export function renderBufferToString(buffer: Cell[][], width: number, height: number): string {
  const lines: string[] = [];

  for (let y = 0; y < Math.min(height, buffer.length); y++) {
    let line = '';
    const row = buffer[y];
    for (let x = 0; x < Math.min(width, row?.length || 0); x++) {
      const cell = row[x];
      line += applyStyle(cell);
    }
    lines.push(line);
  }

  return lines.join('\n');
}

export function renderDiff(buffer: Cell[][], prevBuffer: Cell[][], width: number, height: number): string {
  const lines: string[] = [];

  for (let y = 0; y < Math.min(height, buffer.length); y++) {
    let line = '';
    const row = buffer[y];
    const prevRow = prevBuffer?.[y];

    for (let x = 0; x < Math.min(width, row?.length || 0); x++) {
      const cell = row[x];
      const prevCell = prevRow?.[x];

      const isChanged = !prevCell || cell.char !== prevCell.char || cell.style !== prevCell.style;

      if (isChanged) {
        line += chalk.bgYellow.black(applyStyle(cell));
      } else {
        line += applyStyle(cell);
      }
    }
    lines.push(line);
  }

  return lines.join('\n');
}

interface HighlightConfig {
  rootCause: Array<{ x: number; y: number }>;
  impacted: Array<{ x: number; y: number }>;
}

export function renderWithHighlights(buffer: Cell[][], width: number, height: number, config: HighlightConfig): string {
  const lines: string[] = [];
  const rootSet = new Set(config.rootCause.map(p => `${p.x},${p.y}`));
  const impactedSet = new Set(config.impacted.map(p => `${p.x},${p.y}`));

  for (let y = 0; y < Math.min(height, buffer.length); y++) {
    let line = '';
    const row = buffer[y];

    for (let x = 0; x < Math.min(width, row?.length || 0); x++) {
      const cell = row[x];
      const key = `${x},${y}`;

      if (rootSet.has(key)) {
        line += chalk.bgRed.white(applyStyle(cell));
      } else if (impactedSet.has(key)) {
        line += chalk.bgYellow.black(applyStyle(cell));
      } else {
        line += applyStyle(cell);
      }
    }
    lines.push(line);
  }

  return lines.join('\n');
}