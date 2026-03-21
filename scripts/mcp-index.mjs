#!/usr/bin/env node
/**
 * Helper script: call the local codebase-semantics-mcp server to (re-)index a project.
 * Intended to be invoked by the git post-commit hook.
 *
 * Usage:
 *   node scripts/mcp-index.mjs --name <project-name> --path <project-path>
 *
 * Environment variables (all optional):
 *   MCP_SERVER_CMD   Space-separated command to launch the MCP server.
 *                    Defaults to "node dist/index.js" when dist/index.js exists,
 *                    otherwise "npx codebase-semantics-mcp".
 *   MCP_DATA_DIR     Directory where the index database is stored.
 *   OLLAMA_BASE_URL  Ollama API base URL.
 *   OLLAMA_MODEL     Ollama embedding model name.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { parseArgs } from "node:util";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Argument parsing ──────────────────────────────────────────────────────────

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    name: { type: "string" },
    path: { type: "string" },
  },
});

if (!values.name || !values.path) {
  console.error(
    "Usage: node scripts/mcp-index.mjs --name <project-name> --path <project-path>"
  );
  process.exit(1);
}

const projectName = values.name;
const projectPath = resolve(values.path);

// ── Server command resolution ─────────────────────────────────────────────────

let serverCmd;
let serverArgs;

if (process.env.MCP_SERVER_CMD) {
  [serverCmd, ...serverArgs] = process.env.MCP_SERVER_CMD.split(" ");
} else {
  const localScript = resolve(__dirname, "..", "dist", "index.js");
  if (existsSync(localScript)) {
    serverCmd = "node";
    serverArgs = [localScript];
  } else {
    serverCmd = "npx";
    serverArgs = ["codebase-semantics-mcp"];
  }
}

// ── MCP client ────────────────────────────────────────────────────────────────

const transport = new StdioClientTransport({
  command: serverCmd,
  args: serverArgs,
  env: { ...process.env },
  stderr: "inherit",
});

const client = new Client(
  { name: "git-hook", version: "1.0.0" },
  { capabilities: {} }
);

try {
  await client.connect(transport);

  const result = await client.callTool({
    name: "index_project",
    arguments: { name: projectName, path: projectPath },
  });

  const text = result.content
    .filter((c) => c.type === "text")
    .map((c) => c.text)
    .join("\n");

  console.log(text);
} catch (err) {
  console.error(
    `[mcp-index] Failed to index project '${projectName}': ${err.message}`
  );
  if (err.stack) {
    console.error(err.stack);
  }
  process.exit(1);
} finally {
  await client.close().catch((err) => {
    console.error(`[mcp-index] Warning: error during client cleanup: ${err.message}`);
  });
}
