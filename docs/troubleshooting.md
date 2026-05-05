# Troubleshooting Guide

Solutions for common issues with rte CLI.

## Installation Issues

### "command not found" after global install

**Cause:** npm global bin not in PATH

**Solution:**
```bash
# Add to PATH (for zsh)
echo 'export PATH="$PATH:$(npm config get prefix)/bin"' >> ~/.zshrc
source ~/.zshrc

# Or for bash
echo 'export PATH="$PATH:$(npm config get prefix)/bin"' >> ~/.bashrc
source ~/.bashrc
```

**Alternative:** Use `npm exec` instead of global command:
```bash
npm exec @codeteck/rte -- --version
```

---

### npx shows "command not found"

**Cause:** npx resolves binary differently than npm

**Solution:**
```bash
# Use npm exec instead
npm exec @codeteck/rte -- --help

# Or install globally first
npm install -g @codeteck/rte
```

---

## CLI Execution Issues

### "Error: missing required argument"

**Cause:** Required argument not provided

**Solution:** Provide all required arguments:
```bash
# Wrong
rte dev

# Correct
rte dev my-component.tsx
```

---

### "Error: Session file not found"

**Cause:** File path doesn't exist

**Solution:** Check file path is correct:
```bash
rte replay ./sessions/my-session.json
# Use absolute path if relative doesn't work
rte replay /full/path/to/session.json
```

---

### "Error: Invalid session file: unable to parse JSON"

**Cause:** Session file is corrupted or not valid JSON

**Solution:**
- Check file contains valid JSON
- Verify file wasn't truncated
- Re-generate session with `rte dev --save-session`

---

### "Error: Unknown option"

**Cause:** Using invalid flag

**Solution:** Check valid flags with `--help`:
```bash
rte dev --help
rte diff --help
```

---

## Debug Mode

Enable debug mode to see stack traces:

```bash
rte --debug dev myfile.tsx
rte --debug diff a.json b.json
```

Debug output shows:
- Full stack traces
- Internal error details
- More verbose logging

Use this when reporting issues.

---

## NPM vs NPX vs Direct

### npm exec (recommended for one-off):
```bash
npm exec @codeteck/rte -- benchmark
```

### npx (downloads if not cached):
```bash
npx @codeteck/rte benchmark
```

### Global install (requires PATH):
```bash
npm install -g @codeteck/rte
rte benchmark
```

---

## Performance Issues

### Benchmark runs slow

**Cause:** Large component trees or many frames

**Solution:** Use smaller scenarios:
```bash
rte benchmark --scenario small  # 50 frames
rte benchmark --scenario medium  # 100 frames
```

---

### Memory warnings in benchmark

**Cause:** High memory usage during render

**Solution:** This is informational only. For production use, monitor memory in your application.

---

## Getting Help

1. Enable debug mode: `rte --debug <command>`
2. Check GitHub issues: https://github.com/Nom-nom-hub/rte/issues
3. Review CLI reference: `rte --help`