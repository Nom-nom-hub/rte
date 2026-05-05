import React from 'react';
import { Box, Text } from '../../src/index';

export function BasicStaticApp() {
  return React.createElement(Box, { width: 10, height: 3 },
    React.createElement(Text, { children: 'Hello' })
  );
}

export function StateUpdateApp({ count }: { count: number }) {
  return React.createElement(Box, { width: 20, height: 5 },
    React.createElement(Text, { children: `Count: ${count}` })
  );
}

export function NestedLayoutApp() {
  return React.createElement(Box, { width: 30, height: 10, flexDirection: 'column' },
    React.createElement(Box, { height: 3 },
      React.createElement(Text, { children: 'Header' })
    ),
    React.createElement(Box, { flexGrow: 1 },
      React.createElement(Text, { children: 'Content' })
    ),
    React.createElement(Box, { height: 2 },
      React.createElement(Text, { children: 'Footer' })
    )
  );
}

export function MultiChildApp() {
  return React.createElement(Box, { width: 40, height: 8, flexDirection: 'row' },
    React.createElement(Box, { width: 10 },
      React.createElement(Text, { children: 'A' })
    ),
    React.createElement(Box, { width: 10 },
      React.createElement(Text, { children: 'B' })
    ),
    React.createElement(Box, { width: 10 },
      React.createElement(Text, { children: 'C' })
    ),
    React.createElement(Box, { width: 10 },
      React.createElement(Text, { children: 'D' })
    )
  );
}

export function DeepNestingApp() {
  return React.createElement(Box, { width: 25, height: 15, flexDirection: 'column', padding: 1 },
    React.createElement(Box,
      React.createElement(Text, { children: 'Level 1' })
    ),
    React.createElement(Box, { padding: 1 },
      React.createElement(Box,
        React.createElement(Text, { children: 'Level 2' })
      ),
      React.createElement(Box, { padding: 1 },
        React.createElement(Box,
          React.createElement(Text, { children: 'Level 3' })
        )
      )
    )
  );
}

export interface SessionFixture {
  name: string;
  app: React.ComponentType<any>;
  initialProps?: Record<string, unknown>;
  expectedFrames: number;
}

export const sessionFixtures: SessionFixture[] = [
  {
    name: 'basic-static',
    app: BasicStaticApp,
    expectedFrames: 1,
  },
  {
    name: 'state-update',
    app: StateUpdateApp,
    initialProps: { count: 0 },
    expectedFrames: 1,
  },
  {
    name: 'nested-layout',
    app: NestedLayoutApp,
    expectedFrames: 1,
  },
  {
    name: 'multi-child',
    app: MultiChildApp,
    expectedFrames: 1,
  },
  {
    name: 'deep-nesting',
    app: DeepNestingApp,
    expectedFrames: 1,
  },
];