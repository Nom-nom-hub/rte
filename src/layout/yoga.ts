import Yoga from 'yoga-layout-prebuilt';
import { Node } from '../tree/node';

export function setupYogaNode(node: Node): any {
  const yogaNode = Yoga.Node.create();
  const { props } = node;

  if (node.type === 'box') {
    yogaNode.setFlexDirection(Yoga.FLEX_DIRECTION_COLUMN);
    yogaNode.setDisplay(Yoga.DISPLAY_FLEX);
  }

  if (typeof props.width === 'number') {
    yogaNode.setWidth(props.width);
  }
  if (typeof props.height === 'number') {
    yogaNode.setHeight(props.height);
  }
  if (typeof props.minWidth === 'number') {
    yogaNode.setMinWidth(props.minWidth);
  }
  if (typeof props.minHeight === 'number') {
    yogaNode.setMinHeight(props.minHeight);
  }
  if (typeof props.maxWidth === 'number') {
    yogaNode.setMaxWidth(props.maxWidth);
  }
  if (typeof props.maxHeight === 'number') {
    yogaNode.setMaxHeight(props.maxHeight);
  }

  if (props.margin !== undefined) {
    yogaNode.setMargin(Yoga.EDGE_ALL, props.margin);
  } else {
    if (props.marginTop !== undefined) yogaNode.setMargin(Yoga.EDGE_TOP, props.marginTop);
    if (props.marginBottom !== undefined) yogaNode.setMargin(Yoga.EDGE_BOTTOM, props.marginBottom);
    if (props.marginLeft !== undefined) yogaNode.setMargin(Yoga.EDGE_LEFT, props.marginLeft);
    if (props.marginRight !== undefined) yogaNode.setMargin(Yoga.EDGE_RIGHT, props.marginRight);
  }

  if (props.padding !== undefined) {
    yogaNode.setPadding(Yoga.EDGE_ALL, props.padding);
  } else {
    if (props.paddingTop !== undefined) yogaNode.setPadding(Yoga.EDGE_TOP, props.paddingTop);
    if (props.paddingBottom !== undefined) yogaNode.setPadding(Yoga.EDGE_BOTTOM, props.paddingBottom);
    if (props.paddingLeft !== undefined) yogaNode.setPadding(Yoga.EDGE_LEFT, props.paddingLeft);
    if (props.paddingRight !== undefined) yogaNode.setPadding(Yoga.EDGE_RIGHT, props.paddingRight);
  }

  if (props.flex !== undefined) {
    yogaNode.setFlex(props.flex);
  }
  if (props.flexGrow !== undefined) {
    yogaNode.setFlexGrow(props.flexGrow);
  }
  if (props.flexShrink !== undefined) {
    yogaNode.setFlexShrink(props.flexShrink);
  }

  return yogaNode;
}

export function computeLayout(rootNode: Node): void {
  function walk(node: Node) {
    if (node.yogaNode) {
      node.yogaNode.calculateLayout(
        undefined,
        undefined,
        Yoga.DIRECTION_LTR
      );

      const left = node.yogaNode.getComputedLeft();
      const top = node.yogaNode.getComputedTop();
      const width = node.yogaNode.getComputedWidth();
      const height = node.yogaNode.getComputedHeight();

      node.layout = {
        x: Math.round(left),
        y: Math.round(top),
        width: Math.round(width),
        height: Math.round(height),
      };

      node.children.forEach((child) => walk(child));
    }
  }
  walk(rootNode);
}
