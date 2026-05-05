# CLI Reference

Complete reference for all rte CLI commands.

## Global Options

| Flag | Description |
|------|-------------|
| `-V, --version` | Output version number |
| `-d, --debug` | Enable debug mode with stack traces |
| `-h, --help` | Display help |

## Commands

### rte dev

Run a React file through the engine with debug panel.

```bash
rte dev <file> [options]
```

**Arguments:**
- `file` (required) - Path to React component file

**Options:**
- `-p, --port <port>` - API server port (default: "3000")
- `-s, --save-session` - Save session to `.rte/sessions/`

**Example:**
```bash
rte dev examples/counter.tsx
rte dev src/App.tsx --port 8080 --save-session
```

---

### rte replay

Replay a recorded session with frame stepping.

```bash
rte replay <sessionFile> [options]
```

**Arguments:**
- `sessionFile` (required) - Path to session JSON file

**Options:**
- `-i, --interactive` - Interactive mode with keyboard controls

**Example:**
```bash
rte replay session.json
rte replay session.json --interactive
```

---

### rte diff

Compare two session files and find divergence.

```bash
rte diff <sessionA> <sessionB> [options]
```

**Arguments:**
- `sessionA` (required) - First session file
- `sessionB` (required) - Second session file

**Options:**
- `-v, --visual` - Show visual side-by-side comparison
- `-j, --json` - Output structured debug summary as JSON
- `-s, --summary-only` - Print only explanation (no raw diff)

**Example:**
```bash
rte diff session-1.json session-2.json
rte diff a.json b.json --visual
```

---

### rte verify

Verify current app state against snapshot (CI mode).

```bash
rte verify <snapshot.json> [options]
```

**Arguments:**
- `snapshot.json` (required) - Path to snapshot file

**Options:**
- `-g, --generate` - Generate and compare hash
- `-e, --entry <file>` - Entry file to run

**Example:**
```bash
rte verify snapshot.json --generate
rte verify snapshot.json --entry src/App.tsx
```

---

### rte benchmark

Run performance benchmark.

```bash
rte benchmark [options]
```

**Options:**
- `-s, --scenario <name>` - Benchmark scenario (default: "small")

**Scenarios:**
- `small` - 50 frames, baseline test
- `medium` - 100 frames, moderate load
- `large` - 200 frames, heavy load
- `stress` - High-frequency updates
- `stress-large-tree` - Large component tree stress test

**Example:**
```bash
rte benchmark
rte benchmark --scenario stress
```

---

## Error Format

All errors follow unified format:

```
❌ Error: <message>
  [suggestion]
```

**Common errors:**

| Error | Cause | Fix |
|-------|-------|-----|
| `Missing required argument: file` | No file provided | Provide required argument |
| `Session file not found: <path>` | File doesn't exist | Check file path |
| `Invalid session file: unable to parse JSON` | Corrupted session file | Ensure valid JSON |
| `Unknown option: --flag` | Invalid flag | Use correct flags |

**Exit codes:**
- `0` - Success
- `1` - User error (invalid input, missing files)
- `2` - System error

## Debug Mode

Use `--debug` flag to see stack traces:

```bash
rte --debug dev myfile.tsx
```

This shows internal error details for troubleshooting.

## Output Formats

- **Standard output** - Human-readable terminal output
- **JSON output** - Use `--json` flag for machine-parseable data
- **Visual output** - Use `--visual` flag for side-by-side comparison