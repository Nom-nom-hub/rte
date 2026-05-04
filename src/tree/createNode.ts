import { Node } from './node';

let nodeCounter = 0;

export function createNode(type: 'box' | 'text', props: Record<string, any>): Node {
  const node: Node = {
    id: `node_${++nodeCounter}_${Date.now()}`,
    type,
    props,
    children: [],
  };
  return node;
}
