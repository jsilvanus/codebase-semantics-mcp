import { embed, cosineSimilarity, type OllamaConfig } from "./embedding.js";
import { getChunksByProject } from "../db/sqlite.js";
import type Database from "better-sqlite3";

export interface SearchResult {
  filePath: string;
  chunkType: string;
  name: string | null;
  startLine: number | null;
  endLine: number | null;
  content: string;
  score: number;
}

export interface SearchOptions {
  topK?: number;
  minScore?: number;
  ollamaConfig?: OllamaConfig;
}

/**
 * Performs semantic search over the indexed chunks of a project.
 * Embeds the query, then computes cosine similarity against all stored
 * chunk embeddings and returns the top-K results.
 */
export async function search(
  db: Database.Database,
  projectId: number,
  query: string,
  filePathIndex: Map<number, string>,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  const topK = options.topK ?? 10;
  const minScore = options.minScore ?? 0.0;

  const queryEmbedding = await embed(query, options.ollamaConfig);

  const chunks = getChunksByProject(db, projectId);

  const scored: (SearchResult & { rawScore: number })[] = [];

  for (const chunk of chunks) {
    if (!chunk.embedding) continue;

    const chunkVec = new Float32Array(
      chunk.embedding.buffer,
      chunk.embedding.byteOffset,
      chunk.embedding.byteLength / 4
    );

    const score = cosineSimilarity(queryEmbedding, chunkVec);
    if (score < minScore) continue;

    scored.push({
      filePath: filePathIndex.get(chunk.file_id) ?? "unknown",
      chunkType: chunk.chunk_type,
      name: chunk.name,
      startLine: chunk.start_line,
      endLine: chunk.end_line,
      content: chunk.content,
      score,
      rawScore: score,
    });
  }

  scored.sort((a, b) => b.rawScore - a.rawScore);

  return scored.slice(0, topK).map(({ rawScore: _, ...rest }) => rest);
}

/**
 * Builds a file-id → relative-path lookup map for a project.
 */
export function buildFilePathIndex(
  db: Database.Database,
  projectId: number
): Map<number, string> {
  const rows = db
    .prepare("SELECT id, path FROM files WHERE project_id = ?")
    .all(projectId) as { id: number; path: string }[];

  return new Map(rows.map((r) => [r.id, r.path]));
}
