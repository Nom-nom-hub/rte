import React from 'react';
import { Box, Text } from '../../../src/index';

interface CounterProps {
  count: number;
}

export function CounterApp({ count }: CounterProps) {
  return React.createElement(Box, { width: 40, height: 10, flexDirection: 'column', padding: 1 },
    React.createElement(Box, { height: 2 },
      React.createElement(Text, { children: 'Counter App' })
    ),
    React.createElement(Box, { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
      React.createElement(Text, { children: `Count: ${count}` })
    ),
    React.createElement(Box, { height: 1 },
      React.createElement(Text, { children: 'Press + to increment' })
    )
  );
}

export function CounterAppDefault() {
  return React.createElement(CounterApp, { count: 0 });
}

export default CounterAppDefault;