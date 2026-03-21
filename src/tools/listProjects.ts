import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { listProjects } from "../core/projectManager.js";
import type Database from "better-sqlite3";

export function registerListProjectsTool(
  server: McpServer,
  db: Database.Database
): void {
  server.tool(
    "list_projects",
    "List all projects that have been indexed.",
    {},
    async () => {
      const projects = listProjects(db);

      if (projects.length === 0) {
        return {
          content: [
            { type: "text", text: "No projects indexed yet." },
          ],
        };
      }

      const lines = projects.map(
        (p) => `- **${p.name}**  path: ${p.path}  (created: ${p.created_at})`
      );

      return {
        content: [{ type: "text", text: lines.join("\n") }],
      };
    }
  );
}
