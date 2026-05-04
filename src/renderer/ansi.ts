export function clearScreen(): string {
  return '\x1b[2J\x1b[0;0H';
}

export function hideCursor(): string {
  return '\x1b[?25l';
}

export function showCursor(): string {
  return '\x1b[?25h';
}

export function resetCursor(): string {
  return '\x1b[0;0H';
}
