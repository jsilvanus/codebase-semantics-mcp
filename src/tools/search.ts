import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getProject } from "../core/projectManager.js";
import {
  search as semanticSearch,
  buildFilePathIndex,
} from "../core/search.js";
import type Database from "better-sqlite3";

export function registerSearchTool(
  server: McpServer,
  db: Database.Database,
  ollamaBaseUrl: string,
  ollamaModel: string
): void {
  server.tool(
    "search",
    "Perform a semantic search over an indexed project. " +
      "Returns the most relevant code chunks ranked by similarity to the query.",
    {
      project: z.string().describe("Project name to search in"),
      query: z.string().describe("Natural language or code query"),
      top_k: z
        .number()
        .int()
        .min(1)
        .max(50)
        .optional()
        .default(10)
        .describe("Number of results to return (default: 10)"),
      min_score: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .default(0)
        .describe("Minimum similarity score threshold (0–1, default: 0)"),
    },
    async ({ project, query, top_k, min_score }) => {
      const proj = getProject(db, project);
      if (!proj) {
        return {
          content: [
            {
              type: "text",
              text: `Project "${project}" not found. Run index_project first.`,
            },
          ],
          isError: true,
        };
      }

      const filePathIndex = buildFilePathIndex(db, proj.id);

      let results;
      try {
        results = await semanticSearch(db, proj.id, query, filePathIndex, {
          topK: top_k,
          minScore: min_score,
          ollamaConfig: { baseUrl: ollamaBaseUrl, model: ollamaModel },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const isConnectionError =
          message.includes("fetch failed") ||
          message.includes("ECONNREFUSED") ||
          message.includes("ENOTFOUND");
        const hint = isConnectionError
          ? `\n\nEnsure Ollama is running at ${ollamaBaseUrl} with model "${ollamaModel}" pulled:\n  ollama serve\n  ollama pull ${ollamaModel}`
          : "";
        return {
          content: [
            {
              type: "text",
              text: `Search failed: ${message}${hint}`,
            },
          ],
          isError: true,
        };
      }

      if (results.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "No results found.",
            },
          ],
        };
      }

      const lines: string[] = [];
      for (const r of results) {
        lines.push(
          `## ${r.filePath}${r.name ? ` — ${r.name}` : ""} (score: ${r.score.toFixed(4)})`,
          `Type: ${r.chunkType}${r.startLine != null ? ` | Lines ${r.startLine}–${r.endLine}` : ""}`,
          "```",
          r.content,
          "```",
          ""
        );
      }

      return {
        content: [{ type: "text", text: lines.join("\n") }],
      };
    }
  );
}
