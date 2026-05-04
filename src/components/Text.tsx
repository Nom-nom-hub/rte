import { createElement } from 'react';

export function Text(props: any) {
  return createElement('Text', props, props.children);
}
