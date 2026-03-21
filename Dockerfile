# ── Build stage ───────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ── Production stage ──────────────────────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

# Default data directory — override with -v or MCP_DATA_DIR env var
ENV MCP_DATA_DIR=/data
# Default Ollama URL — points to the 'ollama' service in the compose network.
# When running standalone (host Ollama), set to http://host.docker.internal:11434
ENV OLLAMA_BASE_URL=http://ollama:11434
ENV OLLAMA_MODEL=nomic-embed-text

VOLUME ["/data"]

# Projects to index must be mounted here (read-only is fine).
# e.g.  -v /host/path/to/project:/projects/my-project:ro
VOLUME ["/projects"]

CMD ["node", "dist/index.js"]
