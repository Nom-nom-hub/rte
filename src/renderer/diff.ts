import type { Cell } from './frameBuffer';

export interface AnsiDiff {
  row: number;
  col: number;
  char: string;
  style?: string;
}

export function diffFrameBuffers(
  prev: Cell[][] | null,
  curr: Cell[][]
): AnsiDiff[] {
  const diffs: AnsiDiff[] = [];
  const rows = curr.length;
  const cols = curr[0]?.length || 0;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const prevCell = prev?.[row]?.[col];
      const currCell = curr[row]?.[col];

      const prevChar = prevCell?.char ?? null;
      const currChar = currCell?.char ?? null;

      if (prevChar !== currChar || prevCell?.style !== currCell?.style) {
        diffs.push({
          row,
          col,
          char: currCell?.char ?? '',
          style: currCell?.style,
        });
      }
    }
  }

  return diffs;
}

function colorCode(colorName: string, bg: boolean = false): string {
  const prefix = bg ? '4' : '3';
  switch (colorName) {
    case 'red': return `\x1b[${prefix}1m`;
    case 'green': return `\x1b[${prefix}2m`;
    case 'yellow': return `\x1b[${prefix}3m`;
    case 'blue': return `\x1b[${prefix}4m`;
    case 'magenta': return `\x1b[${prefix}5m`;
    case 'cyan': return `\x1b[${prefix}6m`;
    case 'white': return `\x1b[${prefix}7m`;
    case 'gray':
    case 'grey': return `\x1b[${prefix}0m`;
    default: return '';
  }
}

export function applyAnsiDiff(diffs: AnsiDiff[]): string {
  if (diffs.length === 0) return '';

  // Group diffs by row for more efficient cursor movement
  const byRow: Record<number, AnsiDiff[]> = {};
  for (const diff of diffs) {
    if (!byRow[diff.row]) byRow[diff.row] = [];
    byRow[diff.row].push(diff);
  }

  let output = '';
  const sortedRows = Object.keys(byRow).map(Number).sort((a, b) => a - b);

  for (const row of sortedRows) {
    const rowDiffs = byRow[row].sort((a, b) => a.col - b.col);
    let lastCol = -1;
    
    for (const diff of rowDiffs) {
      if (diff.char === '' && lastCol === -1) continue;
      
      // Only move cursor if we need to
      if (lastCol === -1 || diff.col !== lastCol) {
        output += `\x1b[${row + 1};${diff.col + 1}H`;
      }
      
      // Apply color from style if present
      let fgReset = '';
      let bgReset = '';
      try {
        const style = diff.style ? JSON.parse(diff.style) : {};
        if (style._color || style.color) {
          const code = colorCode(style._color || style.color, false);
          if (code) {
            output += code;
            fgReset = '\x1b[39m';
          }
        }
        if (style._bg || style.bg) {
          const code = colorCode(style._bg || style.bg, true);
          if (code) {
            output += code;
            bgReset = '\x1b[49m';
          }
        }
      } catch (e) {
        // noop
      }
      
      output += diff.char + fgReset + bgReset;
      lastCol = diff.col + 1;
    }
  }
  
  return output;
}