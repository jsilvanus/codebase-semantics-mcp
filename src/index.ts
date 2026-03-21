#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { mkdirSync } from "fs";

import { getDb } from "./db/sqlite.js";
import { registerIndexProjectTool } from "./tools/indexProject.js";
import { registerSearchTool } from "./tools/search.js";
import { registerListProjectsTool } from "./tools/listProjects.js";
import { registerDeleteProjectTool } from "./tools/deleteProject.js";
import { registerStatsTool } from "./tools/stats.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Configuration ─────────────────────────────────────────────────────────────

const DATA_DIR = process.env.MCP_DATA_DIR ?? join(__dirname, "..", "data");
const DB_PATH = join(DATA_DIR, "projects", "index.db");
const OLLAMA_BASE_URL =
  process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "nomic-embed-text";

// ── Bootstrap ─────────────────────────────────────────────────────────────────

mkdirSync(join(DATA_DIR, "projects"), { recursive: true });

const db = getDb(DB_PATH);

const server = new McpServer({
  name: "codebase-semantics-mcp",
  version: "0.1.0",
});

registerIndexProjectTool(server, db, OLLAMA_BASE_URL, OLLAMA_MODEL);
registerSearchTool(server, db, OLLAMA_BASE_URL, OLLAMA_MODEL);
registerListProjectsTool(server, db);
registerDeleteProjectTool(server, db);
registerStatsTool(server, db);

// ── Start stdio transport ─────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
