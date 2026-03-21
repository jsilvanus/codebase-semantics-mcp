# codebase-semantics-mcp

Local MCP server with Ollama support for semantic search of a codebase.

## Features

- **Fully local** — uses [Ollama](https://ollama.com/) for embeddings (no cloud APIs)
- **stdio MCP transport** — drop-in compatible with any MCP-capable client (Claude Desktop, etc.)
- **Multi-project isolation** — index and search multiple projects independently
- **AST-aware chunking** — TypeScript/JavaScript/JSX files are split at function/class/interface boundaries rather than arbitrary line windows
- **Incremental indexing** — files whose content hasn't changed are skipped on subsequent runs

## Prerequisites

- Node.js ≥ 18
- [Ollama](https://ollama.com/) running locally with an embedding model pulled:
  ```sh
  ollama pull nomic-embed-text
  ```

## Installation

```sh
npm install
npm run build
```

## Usage

### Run as an MCP server (stdio)

```sh
node dist/index.js
```

Environment variables:

| Variable         | Default                    | Description                          |
|------------------|----------------------------|--------------------------------------|
| `MCP_DATA_DIR`   | `<repo>/data`              | Directory where `index.db` is stored |
| `OLLAMA_BASE_URL`| `http://localhost:11434`   | Ollama API base URL                  |
| `OLLAMA_MODEL`   | `nomic-embed-text`         | Ollama embedding model               |

### Claude Desktop config example

```json
{
  "mcpServers": {
    "codebase-semantics": {
      "command": "node",
      "args": ["/absolute/path/to/dist/index.js"]
    }
  }
}
```

## MCP Tools

| Tool             | Description                                          |
|------------------|------------------------------------------------------|
| `index_project`  | Index (or re-index) a local project directory        |
| `search`         | Semantic search over an indexed project              |
| `list_projects`  | List all indexed projects                            |
| `delete_project` | Delete a project and all its indexed data            |
| `stats`          | Show file/chunk statistics for a project             |

## Project Structure

```
src/
├── index.ts              # MCP stdio server entry
├── tools/
│   ├── search.ts
│   ├── indexProject.ts
│   ├── listProjects.ts
│   ├── deleteProject.ts
│   └── stats.ts
├── core/
│   ├── embedding.ts      # Ollama client + cosine similarity
│   ├── chunking.ts       # AST + fallback line-window chunking
│   ├── parser.ts         # TS/JS/JSX AST parsing
│   ├── indexer.ts        # File walk + incremental indexing
│   ├── search.ts         # Semantic search
│   └── projectManager.ts # Project CRUD
├── db/
│   ├── sqlite.ts         # DB connection + queries (schema embedded)
│   └── schema.sql        # Schema reference (not read at runtime)
└── utils/
    └── hashing.ts        # SHA-256 content hashing
data/
└── projects/             # SQLite database stored here
```

## Development

```sh
npm run dev        # Run directly with tsx (no build step)
npm run typecheck  # Type-check without emitting
npm run build      # Compile to dist/
```

