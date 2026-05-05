# Changelog

All notable changes to React Terminal Engine (rte).

## v1.0.0 - Initial Release

### Added
- **CLI Commands**
  - `rte dev` - Run React files with interactive debug panel
  - `rte replay` - Replay recorded sessions with frame stepping
  - `rte diff` - Compare two sessions and find divergence
  - `rte verify` - CI mode verification against snapshots
  - `rte benchmark` - Performance benchmarking tool

- **Core Features**
  - Custom React reconciler for terminal rendering
  - Yoga flexbox layout engine integration
  - Frame buffer system for render snapshots
  - Session recording and storage (JSON format)
  - Deterministic rendering guarantee
  - Causality tracking system

- **CLI UX**
  - Unified error format (❌ Error: ...)
  - Debug mode with `--debug` flag
  - Consistent help text across all commands
  - Proper exit codes (0 success, 1 user error)

### Features
- Multiple benchmark scenarios (small, medium, large, stress)
- Visual diff comparison with `--visual` flag
- JSON output for programmatic use
- Session saving with `--save-session`
- Interactive replay mode

### Known Limitations
- No interactive user input simulation
- Limited CSS support (flexbox only)
- No server-side rendering support
- Large component trees may impact performance
- Benchmark warnings indicate performance thresholds exceeded

### Stability Notes
- Core rendering pipeline is stable
- Session format is versioned
- CLI interface is stable (no breaking changes planned)
- Error handling is comprehensive

### Package Info
- **Name:** @codeteck/rte
- **License:** MIT
- **Node:** >=18.0.0
- **Dependencies:** chalk, commander, react, react-reconciler, yoga-layout-prebuilt

---

### Installation

```bash
npm install -g @codeteck/rte
```

### Quick Start

```bash
rte dev examples/counter.tsx
rte benchmark
rte diff session-a.json session-b.json
```

---

For issues and feedback: https://github.com/Nom-nom-hub/rte/issues