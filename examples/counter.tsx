import React, { useState, useEffect } from 'react';
import { render, Box, Text } from '../src';

let counter = 0;
function CounterApp() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      counter++;
      setCount(counter);
      console.log('Tick:', counter);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Box width={40} padding={2} bg="blue">
      <Text style={{ color: 'yellow' }}>Counter: {count}</Text>
      <Text style={{ color: 'green' }}>Time: {new Date().toLocaleTimeString()}</Text>
    </Box>
  );
}

function App() {
  return (
    <Box width={80} height={24} padding={4} bg="blue">
      <Text style={{ color: 'yellow' }}>React Terminal Engine - State Demo</Text>
      <Text style={{ color: 'white' }}>---</Text>
      <CounterApp />
      <Text style={{ color: 'white' }}>---</Text>
      <Text style={{ color: 'cyan' }}>Press Ctrl+C to exit</Text>
    </Box>
  );
}

render(<App />);

console.log('');
console.log('API server: http://localhost:3000');
console.log('Endpoints:');
console.log('  GET  /ui/tree  - Get current UI tree');
console.log('  GET  /ui/frame - Get current frame');
console.log('  POST /ui/input - Send input events');
console.log('');
console.log('Press Ctrl+C to exit');
