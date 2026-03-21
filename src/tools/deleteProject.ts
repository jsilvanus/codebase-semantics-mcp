import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { removeProject } from "../core/projectManager.js";
import type Database from "better-sqlite3";

export function registerDeleteProjectTool(
  server: McpServer,
  db: Database.Database
): void {
  server.tool(
    "delete_project",
    "Delete an indexed project and all its associated files and chunks from the database.",
    {
      name: z.string().describe("Name of the project to delete"),
    },
    async ({ name }) => {
      const deleted = removeProject(db, name);

      if (!deleted) {
        return {
          content: [
            {
              type: "text",
              text: `Project "${name}" not found.`,
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text",
            text: `Project "${name}" and all its indexed data have been deleted.`,
          },
        ],
      };
    }
  );
}
