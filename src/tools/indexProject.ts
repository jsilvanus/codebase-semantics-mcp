import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createProject } from "../core/projectManager.js";
import { indexProject } from "../core/indexer.js";
import type Database from "better-sqlite3";
import type { ProgressToken } from "@modelcontextprotocol/sdk/types.js";

export function registerIndexProjectTool(
  server: McpServer,
  db: Database.Database,
  ollamaBaseUrl: string,
  ollamaModel: string
): void {
  server.tool(
    "index_project",
    "Index (or re-index) a local project directory for semantic search. " +
      "Walks the directory tree, parses source files with AST awareness, " +
      "generates embeddings via Ollama, and stores them in the local database. " +
      "Files that have not changed since last indexing are skipped automatically.",
    {
      name: z.string().describe("Unique project name / identifier"),
      path: z
        .string()
        .describe("Absolute path to the project root directory"),
    },
    async ({ name, path }, extra) => {
      const progressToken = extra._meta?.progressToken as ProgressToken | undefined;

      const onProgress = progressToken
        ? async (message: string, progress: number, total: number) => {
            await extra.sendNotification({
              method: "notifications/progress",
              params: { progressToken, progress, total, message },
            });
          }
        : undefined;

      const project = createProject(db, name, path);
      const result = await indexProject(db, project.id, path, {
        baseUrl: ollamaBaseUrl,
        model: ollamaModel,
      }, onProgress);

      const summary = [
        `Project: ${name}`,
        `Path: ${path}`,
        `Indexed: ${result.indexed} files`,
        `Skipped (unchanged): ${result.skipped} files`,
        `Failed: ${result.failed} files`,
      ];

      if (result.errors.length > 0) {
        summary.push("", "Errors:", ...result.errors.slice(0, 10));
        if (result.errors.length > 10) {
          summary.push(`... and ${result.errors.length - 10} more`);
        }
      }

      return {
        content: [{ type: "text", text: summary.join("\n") }],
      };
    }
  );
}
