import React, { useState, useEffect } from 'react';
import { render, Box, Text } from '../src';

let counter = 0;
function CounterApp() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      counter++;
      setCount(counter);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Text style={{ color: 'yellow' }}>Counter: {count}</Text>
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
