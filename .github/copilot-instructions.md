---
name: copilot-instructions
description: "Workspace instructions for Copilot Chat and local agents: project context, common commands, and guidance for interacting with this repository."
applyTo:
  - "src/**"
  - "README.md"
---

# Workspace quick facts

- **Purpose:** Local MCP server providing semantic code search using Ollama for embeddings.
- **Language / Runtime:** TypeScript (Node.js >= 18)
- **Build / Dev:** `npm install`, `npm run build`, `npm run dev`
- **Start (stdio MCP):** `node dist/index.js`
- **Prerequisites:** Node.js >= 18; Ollama running locally with an embedding model pulled (`ollama pull nomic-embed-text`).

# Useful files

- `README.md` — project overview and usage
- `package.json` — build and dev scripts
- `src/` — source; `dist/` — compiled output

# Conventions

- Project uses TypeScript compiled to `dist/`.
- Default data directory: environment `MCP_DATA_DIR` (defaults to `<repo>/data`).
- Embeddings via Ollama configured with `OLLAMA_BASE_URL` and `OLLAMA_MODEL` environment variables.

# Agent guidance (how to use me)

- For development tasks, prefer `npm run dev` which runs `tsx src/index.ts`.
- To index a project for semantic search, call the `index_project` tool with a unique name and absolute path.
- When asking the agent for help, include explicit intents and file paths, for example: "Index project at C:\\Users\\me\\projects\\foo" or "Search project 'myproj' for how we parse AST chunks".

# Anti-patterns / Cautions

- Do NOT set `applyTo: "**"` in new instructions — that causes the instruction to always load and may bloat context.
- Avoid putting secrets or absolute local paths in instructions.
- Keep descriptions focused and include trigger keywords (e.g., "index", "search", "ollama", "MCP") so agents can discover relevant instructions.

# Example prompts

- "Index project at C:\\Users\\me\\projects\\foo with name 'foo'"
- "Search project 'foo' for usages of 'hashContent'"
- "Explain how `indexProject` handles unchanged files and incremental indexing"

# Next recommended customizations

- Add a focused prompt under `.github/prompts/` for common tasks: `index.prompt.md` (parameters: path, name).
- Create a custom agent `indexer.agent.md` to run indexing workflows with restricted tool access and lifecycle hooks.

If you'd like, I can create the prompt or agent files next.
