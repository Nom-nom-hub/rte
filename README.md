# React Terminal Engine (rte)

[![npm version](https://img.shields.io/npm/v/@codeteck/rte)](https://www.npmjs.com/package/@codeteck/rte)
[![npm downloads](https://img.shields.io/npm/dm/@codeteck/rte)](https://www.npmjs.com/package/@codeteck/rte)
[![node](https://img.shields.io/node/v/@codeteck/rte)](https://nodejs.org)
[![license: MIT](https://img.shields.io/badge/license-MIT-green.svg)](https://github.com/Nom-nom-hub/rte/blob/main/LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/Nom-nom-hub/rte)](https://github.com/Nom-nom-hub/rte)

A terminal-based React rendering and debugging CLI that captures, replays, and compares React component render states in a deterministic environment.

## Why rte?

React debugging in terminals is difficult. rte provides:
- **Deterministic rendering** - Same input always produces same output
- **Frame capture** - Record every render state as a frame
- **Session replay** - Walk through render history frame-by-frame
- **Diff comparison** - Compare two sessions to find divergence
- **Benchmarking** - Measure render performance in terminal

## Installation

```bash
npm install -g @codeteck/rte
```

Or use without installing:
```bash
npx @codeteck/rte --version
npm exec @codeteck/rte -- benchmark
```

## Quick Start

```bash
# Run a React file with debug panel
rte dev examples/counter.tsx

# Record a session, then replay it
rte replay session.json

# Compare two sessions
rte diff session-a.json session-b.json

# Run performance benchmark
rte benchmark
```

## Commands

| Command | Description |
|---------|-------------|
| `rte dev <file>` | Run a React file with interactive debug panel |
| `rte replay <file>` | Replay a recorded session with frame stepping |
| `rte diff <fileA> <fileB>` | Compare two session files and find divergence |
| `rte verify <file>` | Verify current app state against snapshot (CI mode) |
| `rte benchmark` | Run performance benchmark (default: small) |

## Options

| Command | Options |
|---------|---------|
| `rte dev` | `-p, --port <port>` API server port, `-s, --save-session` Save session |
| `rte replay` | `-i, --interactive` Interactive keyboard controls |
| `rte diff` | `-v, --visual` Visual side-by-side, `-j, --json` JSON output, `-s, --summary-only` Summary only |
| `rte verify` | `-g, --generate` Generate hash, `-e, --entry <file>` Entry file |
| `rte benchmark` | `-s, --scenario` Scenario: small, medium, large, stress, stress-large-tree |

## Debug Mode

Enable stack traces and internal error details:
```bash
rte --debug dev myfile.tsx
```

## Examples

See `examples/` directory:
- `counter.tsx` - Simple counter component
- `basic.tsx` - Basic layout example

## Links

- GitHub: https://github.com/Nom-nom-hub/rte
- npm: https://www.npmjs.com/package/@codeteck/rte