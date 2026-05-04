import type { UpdateReason } from '../deterministic/causality.js';

export interface Cell {
  char: string;
  style?: string;
}

export type FrameBuffer = Cell[][];

export interface Frame {
  tree: any;
  buffer: FrameBuffer;
  hash: string;
  updates?: UpdateReason[];
}