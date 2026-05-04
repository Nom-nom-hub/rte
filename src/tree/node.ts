export interface Node {
  id: string;
  type: 'box' | 'text';
  props: Record<string, any>;
  children: Node[];
  layout?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  yogaNode?: any;
  parent?: Node;
  internal?: {
    textValue?: string;
    isTextNode?: boolean;
  };
}
