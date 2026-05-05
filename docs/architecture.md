# Architecture Overview

High-level system design and conceptual understanding of rte.

## System Overview

rte is a terminal-based React rendering engine that captures, stores, and replays React component render states in a deterministic environment.

```
React Component → Reconciler → Frame Buffer → CLI Output
                              ↓
                        Frame Store
                              ↓
                        Session (JSON)
```

## Core Components

### 1. React Reconciler (`src/core/`)

A custom React reconciler that intercepts all component updates:
- Implements React Reconciler interface
- Captures every render transaction
- Converts React elements to layout trees

### 2. Yoga Layout Engine (`src/layout/`)

Uses Facebook's Yoga for flexbox layout:
- Calculates component dimensions and positions
- Outputs layout tree with x, y, width, height
- Platform-agnostic layout computation

### 3. Frame Buffer (`src/renderer/`)

Converts layout trees to terminal representation:
- Maps layout nodes to terminal cells
- Applies ANSI styling for colors/effects
- Generates frame snapshots

### 4. Causality System (`src/deterministic/`)

Ensures deterministic rendering:
- Tracks cause-and-effect of state changes
- Enables session replay with exact frame sequence
- No timing-dependent behavior

## Rendering Pipeline

1. **Component Mount/Update** → React calls reconciler
2. **Reconciler Processing** → Creates element tree
3. **Layout Calculation** → Yoga computes positions
4. **Frame Generation** → Buffer renders to text
5. **Frame Storage** → Session captures frame
6. **Output** → CLI displays frame

## Session System

A session is a JSON file containing:
- **Frames** - Array of render snapshots
- **Metadata** - Timestamp, component info
- **Tree** - Full component hierarchy

Sessions enable:
- **Replay** - Step through frames sequentially
- **Diff** - Compare two sessions for divergence
- **Verify** - Compare against known-good snapshots

## Determinism Model

rte guarantees identical output for identical input:
- No random number generation
- No timing-dependent code
- All state changes tracked
- Frames are pure snapshots

## Replay System

Session replay works by:
1. Loading session JSON file
2. Iterating through frames in order
3. Displaying each frame with navigation
4. Interactive mode allows frame-by-frame stepping

## Diff System

Compares two sessions:
- Frame-by-frame buffer comparison
- Tree structure divergence detection
- Visual highlighting of changes

## Benchmark System

Performance testing framework:
- Runs predefined scenarios
- Measures render times
- Tracks memory usage
- Reports FPS and throughput

## Version 1.0.0 Capabilities

- Basic React component rendering
- Session recording and replay
- Session comparison/diff
- CLI with unified error handling
- Benchmark runner

## Known Limitations

- No interactive user input simulation
- Limited CSS support (flexbox only)
- No server-side rendering
- Small component tree recommended for benchmarks