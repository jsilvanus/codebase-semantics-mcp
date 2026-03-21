---
name: git-hook-setup
description: "Instructions for setting up and using the post-commit git hook that keeps the semantic index up to date."
applyTo:
  - "hooks/**"
  - "scripts/mcp-index.mjs"
---

# Git hook: keep the semantic index up to date

This repository ships two files that together implement an automatic semantic re-index on every commit:

| File | Purpose |
|------|---------|
| `hooks/post-commit` | Shell script template for the git `post-commit` hook |
| `scripts/mcp-index.mjs` | Node.js helper that calls the local MCP server's `index_project` tool |

---

## How it works

1. After `git commit`, Git runs `.git/hooks/post-commit`.
2. The hook invokes `scripts/mcp-index.mjs --name <project> --path <repo-root>`.
3. The helper starts the local MCP server via stdio, sends an `index_project` request, and prints the result.
4. Because indexing is incremental, only files that changed since the last index run are re-embedded.

---

## Installation

### Symlink (recommended — stays in sync with hook changes)

```sh
ln -sf ../../hooks/post-commit .git/hooks/post-commit
```

### Copy (manual sync required after updates)

```sh
cp hooks/post-commit .git/hooks/post-commit
chmod +x .git/hooks/post-commit
```

---

## Prerequisites

- Node.js ≥ 18
- Ollama running locally with the embedding model pulled (`ollama pull nomic-embed-text`)
- The MCP server built (`npm run build`) **or** installed globally (`npm install -g codebase-semantics-mcp`)

---

## Configuration

All configuration is via environment variables (set in your shell profile or a `.env` file that you source before committing):

| Variable | Default | Description |
|----------|---------|-------------|
| `MCP_PROJECT_NAME` | repo directory name | Identifier used for the project in the index |
| `MCP_SERVER_CMD` | `node dist/index.js` | Space-separated command to launch the MCP server |
| `MCP_DATA_DIR` | `<repo>/data` | Directory where `index.db` is stored |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama API base URL |
| `OLLAMA_MODEL` | `nomic-embed-text` | Ollama embedding model |

---

## Example agent prompts

- "Set up the post-commit hook for this repository"
- "Why is my semantic index not updating after commits?"
- "How do I configure a custom project name for the semantic index?"
