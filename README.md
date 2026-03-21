# codebase-semantics-mcp

Local MCP server with Ollama support for semantic search of a codebase.

## Features

- **Fully local** — uses [Ollama](https://ollama.com/) for embeddings (no cloud APIs)
- **stdio MCP transport** — drop-in compatible with any MCP-capable client (Claude Desktop, etc.)
- **Multi-project isolation** — index and search multiple projects independently
- **AST-aware chunking** — TypeScript/JavaScript/JSX files are split at function/class/interface boundaries rather than arbitrary line windows
- **Incremental indexing** — files whose content hasn't changed are skipped on subsequent runs

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Ollama runs as a container)
- For local development without Docker: Node.js ≥ 18

---

## Docker Setup (recommended)

### 1. Start Ollama and pull the embedding model

```sh
docker compose up -d ollama
```

Wait a moment for Ollama to be ready, then pull the embedding model:

```sh
docker exec ollama ollama pull nomic-embed-text
```

Alternatively, let the included `ollama-pull` helper service do it automatically:

```sh
docker compose up ollama-pull
```

Ollama is now reachable on your host at `http://localhost:11434` and inside the
`mcp-net` Docker network as `http://ollama:11434`.

### 2. Build the MCP server image

```sh
docker compose build codebase-semantics-mcp
```

This produces the `codebase-semantics-mcp:latest` image used in all Docker-based workflows below.

---

## Usage

### Option A — Docker (recommended)

The MCP server uses stdio transport, so your MCP client (e.g. Claude Desktop) launches
a fresh container per session.  Configure it with `docker run`:

#### Claude Desktop — Docker config

Edit `claude_desktop_config.json` and add:

```json
{
  "mcpServers": {
    "codebase-semantics": {
      "command": "docker",
      "args": [
        "run", "--rm", "-i",
        "--network", "mcp-net",
        "-e", "OLLAMA_BASE_URL=http://ollama:11434",
        "-v", "codebase-semantics-mcp_mcp-data:/data",
        "-v", "C:/Users/you/projects:/projects:ro",
        "codebase-semantics-mcp:latest"
      ]
    }
  }
}
```

> **Windows path note:** replace `C:/Users/you/projects` with the host path
> containing the projects you want to index.  The path inside the container
> (`/projects`) is what you pass to `index_project`.

#### Indexing a project from Docker

After connecting, call the `index_project` tool and pass the **container-side** path:

```
index_project(name="my-app", path="/projects/my-app")
```

#### Connecting to Ollama from a standalone container (no compose network)

If you started Ollama outside of this compose file, use `host.docker.internal`
instead of the service name:

```sh
docker run --rm -i \
  -e OLLAMA_BASE_URL=http://host.docker.internal:11434 \
  -v codebase-semantics-mcp_mcp-data:/data \
  -v C:/Users/you/projects:/projects:ro \
  codebase-semantics-mcp:latest
```

---

### Option B — Node.js (local dev / no Docker)

```sh
npm install
npm run build
node dist/index.js
```

Set `OLLAMA_BASE_URL` to point to the Ollama container exposed on your host:

```sh
OLLAMA_BASE_URL=http://localhost:11434 node dist/index.js
```

#### Claude Desktop — Node config

```json
{
  "mcpServers": {
    "codebase-semantics": {
      "command": "node",
      "args": ["C:/absolute/path/to/dist/index.js"],
      "env": {
        "OLLAMA_BASE_URL": "http://localhost:11434"
      }
    }
  }
}
```

---

## Environment Variables

| Variable          | Default (Docker image)      | Default (Node)               | Description                          |
|-------------------|-----------------------------|------------------------------|--------------------------------------|
| `MCP_DATA_DIR`    | `/data`                     | `<repo>/data`                | Directory where `index.db` is stored |
| `OLLAMA_BASE_URL` | `http://ollama:11434`       | `http://localhost:11434`     | Ollama API base URL                  |
| `OLLAMA_MODEL`    | `nomic-embed-text`          | `nomic-embed-text`           | Ollama embedding model               |

---

## MCP Tools

| Tool             | Description                                          |
|------------------|------------------------------------------------------|
| `index_project`  | Index (or re-index) a local project directory        |
| `search`         | Semantic search over an indexed project              |
| `list_projects`  | List all indexed projects                            |
| `delete_project` | Delete a project and all its indexed data            |
| `stats`          | Show file/chunk statistics for a project             |

---

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
└── projects/             # SQLite database stored here (host dev only)
Dockerfile                # Multi-stage image build for the MCP server
docker-compose.yml        # Ollama + MCP services on the mcp-net network
```

## Development

```sh
npm run dev        # Run directly with tsx (no build step)
npm run typecheck  # Type-check without emitting
npm run build      # Compile to dist/
```

