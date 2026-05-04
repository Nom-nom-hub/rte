import { FrameBuffer, Cell } from './frameBuffer';
import { Node } from '../tree/node';

export function createFrameBuffer(width: number, height: number): FrameBuffer {
  const buffer: FrameBuffer = [];
  for (let y = 0; y < height; y++) {
    buffer[y] = [];
    for (let x = 0; x < width; x++) {
      buffer[y][x] = { char: ' ', style: undefined };
    }
  }
  return buffer;
}

function drawChar(buffer: FrameBuffer, x: number, y: number, char: string, style?: string): void {
  if (x < 0 || y < 0 || y >= buffer.length) return;
  if (buffer[y] === undefined || x >= buffer[y].length) return;
  const existing = buffer[y][x];
  if (existing.char === ' ' || char.trim() !== '') {
    buffer[y][x] = { char, style };
  }
}

export function drawNodeToBuffer(node: Node, buffer: FrameBuffer): void {
  if (!node.layout) return;

  const { x, y, width, height } = node.layout;
  const bufferHeight = buffer.length;
  const bufferWidth = buffer[0]?.length || 0;

  if (node.type === 'text') {
    const text = node.internal?.textValue || '';
    const style = node.props.style || {};
    const color = style.color;
    
    for (let i = 0; i < text.length; i++) {
      const col = Math.round(x) + i;
      const row = Math.round(y);
      
      if (col >= 0 && row >= 0 && row < bufferHeight && col < bufferWidth) {
        let char = text[i];
        let styleStr = JSON.stringify(style);
        
        if (color) {
          styleStr = JSON.stringify({ ...style, _color: color });
        }
        
        drawChar(buffer, col, row, char, styleStr);
      }
    }
  } else if (node.type === 'box') {
    if (node.props.bg) {
      const bgColor = node.props.bg;
      const startRow = Math.max(0, Math.round(y));
      const endRow = Math.min(bufferHeight - 1, Math.round(y + height - 1));
      const startCol = Math.max(0, Math.round(x));
      const endCol = Math.min(bufferWidth - 1, Math.round(x + width - 1));
      
      for (let row = startRow; row <= endRow; row++) {
        for (let col = startCol; col <= endCol; col++) {
          const existing = buffer[row]?.[col];
          if (existing && existing.char === ' ') {
            let styleStr = existing.style;
            try {
              const s = existing.style ? JSON.parse(existing.style) : {};
              s._bg = bgColor;
              styleStr = JSON.stringify(s);
            } catch (e) {
              styleStr = JSON.stringify({ _bg: bgColor });
            }
            buffer[row][col] = { char: ' ', style: styleStr };
          }
        }
      }
    }
  }

  node.children.forEach((child) => drawNodeToBuffer(child, buffer));
}

export function drawToBuffer(rootNode: Node, width: number, height: number): FrameBuffer {
  const buffer = createFrameBuffer(width, height);
  drawNodeToBuffer(rootNode, buffer);
  return buffer;
}
