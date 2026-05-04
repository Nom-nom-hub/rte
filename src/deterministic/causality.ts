export type UpdateReasonType = 'props' | 'state' | 'parent' | 'mount';

export interface UpdateReason {
  nodeId: string;
  reason: UpdateReasonType;
  prevProps?: Record<string, unknown>;
  nextProps?: Record<string, unknown>;
  prevState?: Record<string, unknown>;
  nextState?: Record<string, unknown>;
  frameIndex: number;
}

class CausalityTracker {
  private updates: UpdateReason[] = [];
  private frameIndex: number = 0;
  private nodeIdCounter: number = 0;
  private nodeIdMap: Map<any, string> = new Map();

  getNodeId(node: any): string {
    if (!this.nodeIdMap.has(node)) {
      const id = `node-${this.nodeIdCounter++}`;
      this.nodeIdMap.set(node, id);
    }
    return this.nodeIdMap.get(node)!;
  }

  recordMount(node: any): void {
    const nodeId = this.getNodeId(node);
    this.updates.push({
      nodeId,
      reason: 'mount',
      frameIndex: this.frameIndex,
    });
  }

  recordUpdate(
    node: any,
    reason: UpdateReasonType,
    prevProps?: Record<string, unknown>,
    nextProps?: Record<string, unknown>,
    prevState?: Record<string, unknown>,
    nextState?: Record<string, unknown>
  ): void {
    const nodeId = this.getNodeId(node);
    this.updates.push({
      nodeId,
      reason,
      prevProps,
      nextProps,
      prevState,
      nextState,
      frameIndex: this.frameIndex,
    });
  }

  recordParentUpdate(node: any): void {
    const nodeId = this.getNodeId(node);
    this.updates.push({
      nodeId,
      reason: 'parent',
      frameIndex: this.frameIndex,
    });
  }

  getUpdatesForFrame(index: number): UpdateReason[] {
    return this.updates.filter(u => u.frameIndex === index);
  }

  getAllUpdates(): UpdateReason[] {
    return [...this.updates];
  }

  clear(): void {
    this.updates = [];
    this.nodeIdMap.clear();
  }

  nextFrame(): void {
    this.frameIndex++;
  }

  getCurrentFrameIndex(): number {
    return this.frameIndex;
  }

  getUpdatesForNode(nodeId: string): UpdateReason[] {
    return this.updates.filter(u => u.nodeId === nodeId);
  }
}

let causalityTrackerInstance: CausalityTracker | null = null;

export function getCausalityTracker(): CausalityTracker {
  if (!causalityTrackerInstance) {
    causalityTrackerInstance = new CausalityTracker();
  }
  return causalityTrackerInstance;
}

export function shallowDiff(prev: Record<string, unknown> | undefined, next: Record<string, unknown> | undefined): Record<string, { from: unknown; to: unknown }> | null {
  if (!prev && !next) return null;
  if (!prev) {
    const changes: Record<string, { from: unknown; to: unknown }> = {};
    for (const key of Object.keys(next || {})) {
      changes[key] = { from: undefined, to: (next as any)[key] };
    }
    return Object.keys(changes).length > 0 ? changes : null;
  }
  if (!next) {
    const changes: Record<string, { from: unknown; to: unknown }> = {};
    for (const key of Object.keys(prev)) {
      changes[key] = { from: prev[key], to: undefined };
    }
    return Object.keys(changes).length > 0 ? changes : null;
  }

  const changes: Record<string, { from: unknown; to: unknown }> = {};
  const allKeys = new Set([...Object.keys(prev), ...Object.keys(next)]);

  for (const key of allKeys) {
    if (prev[key] !== next[key]) {
      changes[key] = { from: prev[key], to: next[key] };
    }
  }

  return Object.keys(changes).length > 0 ? changes : null;
}