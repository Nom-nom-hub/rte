import { createElement } from 'react';

export function Box(props: any) {
  return createElement('Box', props, props.children);
}
