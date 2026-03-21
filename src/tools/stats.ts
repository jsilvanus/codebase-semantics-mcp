import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getProject } from "../core/projectManager.js";
import { getProjectStats } from "../db/sqlite.js";
import type Database from "better-sqlite3";

export function registerStatsTool(
  server: McpServer,
  db: Database.Database
): void {
  server.tool(
    "stats",
    "Show statistics for an indexed project (file count, chunk count, etc.).",
    {
      project: z.string().describe("Name of the project"),
    },
    async ({ project }) => {
      const proj = getProject(db, project);
      if (!proj) {
        return {
          content: [
            {
              type: "text",
              text: `Project "${project}" not found.`,
            },
          ],
          isError: true,
        };
      }

      const stats = getProjectStats(db, proj.id);

      const lines = [
        `**Project:** ${proj.name}`,
        `**Path:** ${proj.path}`,
        `**Created:** ${proj.created_at}`,
        `**Indexed files:** ${stats.fileCount}`,
        `**Total chunks:** ${stats.chunkCount}`,
      ];

      return {
        content: [{ type: "text", text: lines.join("\n") }],
      };
    }
  );
}
