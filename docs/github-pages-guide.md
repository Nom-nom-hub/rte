# GitHub Pages Guide for Documentation

## Overview

This will guide contributors or users of the **React Terminal Engine** on how to access and update the documentation hosted using GitHub Pages.

---

### Step 1: Enable GitHub Pages
1. Go to your repository settings.
2. Navigate to the **Pages** section.
3. Under the "Source" option, select `main` as the branch and save it.
4. GitHub will provide a URL like `https://nom-nom-hub.github.io/rte` for the hosted documentation.

---

### Step 2: File Organization
Documentation files should follow this structure:

```
/docs
  index.html    # Homepage (overview of the project)
  cli.html      # Commands reference for rte.
  troubleshooting.md  # Common issues and solutions.
```

---

### Step 3: Synchronizing Updates
- Any changes to `.html` or documentation files under `/docs` in the **`main` branch** will automatically update the GitHub Pages.

---

### Step 4: Contribution
1. Fork the repository and clone it locally.
2. Make changes or additions to the `/docs` files.
3. Preview your changes locally before pushing.
   - Use a simple HTTP server:
     ```bash
     cd docs
     python -m http.server
     ```
4. Push to your fork and create a pull request.

---

### Step 5: Current Documentation
Access hosted docs:
- CLI Reference: https://nom-nom-hub.github.io/rte/cli.html
- Troubleshooting: https://nom-nom-hub.github.io/rte/troubleshooting.html