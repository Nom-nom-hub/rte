import React from 'react';
import { render, Box, Text, startApiServer } from 'rte';

function App() {
  return (
    <Box width={80} height={24} padding={2} bg="blue">
      <Text style={{ color: 'yellow' }}>Hello</Text>
      <Text style={{ color: 'green' }}>World</Text>
      <Text style={{ color: 'white' }}>From React Terminal Engine</Text>
    </Box>
  );
}

render(<App />);
startApiServer(3000);

console.log('\nAPI server starting on http://localhost:3000');
console.log('Press Ctrl+C to exit\n');

setInterval(() => {}, 1000);
