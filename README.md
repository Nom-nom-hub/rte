# React Terminal Engine (rte)

Terminal-based React rendering and debugging CLI tool.

## Install

```bash
npm install -g rte
```

## Usage

```bash
rte dev <file>          # Run a React file with debug panel
rte replay <session>     # Replay a recorded session
rte diff <a> <b>        # Compare two session files
rte verify <snapshot> # Verify app state against snapshot
rte benchmark           # Run performance benchmark
```

## Commands

| Command | Description |
|---------|-------------|
| `rte dev <file>` | Run React file with debug panel |
| `rte replay <session>` | Replay recorded session |
| `rte diff <a> <b>` | Compare two sessions |
| `rte verify <file>` | CI mode verification |
| `rte benchmark` | Run performance tests |

## Options

- `rte dev --save-session` - Save session to `.rte/sessions/`
- `rte diff --visual` - Show visual side-by-side comparison
- `rte benchmark --scenario stress` - Run stress test