import { readFileSync, readdirSync, statSync, existsSync } from "fs";
import { join, relative, extname } from "path";
import { hashContent } from "../utils/hashing.js";
import { chunkFile } from "./chunking.js";
import { embed, type OllamaConfig } from "./embedding.js";
import {
  upsertFile,
  getFile,
  deleteChunksByFile,
  insertChunk,
  type FileRow,
} from "../db/sqlite.js";
import type Database from "better-sqlite3";

const IGNORED_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  ".nuxt",
  "coverage",
  "__pycache__",
  ".cache",
  "vendor",
]);

const INDEXED_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".mts",
  ".cts",
  ".py",
  ".go",
  ".rs",
  ".java",
  ".c",
  ".cpp",
  ".h",
  ".hpp",
  ".cs",
  ".rb",
  ".php",
  ".swift",
  ".kt",
  ".md",
  ".mdx",
  ".json",
  ".yaml",
  ".yml",
  ".toml",
  ".sql",
  ".sh",
  ".bash",
  ".zsh",
  ".env",
]);

export interface IndexResult {
  indexed: number;
  skipped: number;
  failed: number;
  embeddingFailures: number;
  errors: string[];
}

export interface IndexResultWithFiles extends IndexResult {
  indexedFiles: string[];
}

/**
 * Recursively collects all indexable source files under rootDir.
 */
function collectFiles(rootDir: string): string[] {
  const results: string[] = [];

  const walk = (dir: string): void => {
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.startsWith(".") && entry !== ".env") continue;
      const fullPath = join(dir, entry);
      let stat;
      try {
        stat = statSync(fullPath);
      } catch {
        continue;
      }
      if (stat.isDirectory()) {
        if (!IGNORED_DIRS.has(entry)) walk(fullPath);
      } else if (INDEXED_EXTENSIONS.has(extname(entry).toLowerCase())) {
        results.push(fullPath);
      }
    }
  };

  walk(rootDir);
  return results;
}

/**
 * Indexes (or re-indexes) a single file.
 * Skips the file if its hash hasn't changed since last indexing.
 * Returns "indexed" | "skipped" | "failed".
 */
async function indexFile(
  db: Database.Database,
  projectId: number,
  rootDir: string,
  absolutePath: string,
  ollamaConfig: OllamaConfig
): Promise<{ status: "indexed" | "skipped" | "failed"; embeddingFailures: number }> {
  let code: string;
  try {
    code = readFileSync(absolutePath, "utf8");
  } catch {
    return { status: "failed", embeddingFailures: 0 };
  }

  const hash = hashContent(code);
  const relPath = relative(rootDir, absolutePath);
  const existing: FileRow | undefined = getFile(db, projectId, relPath);

  if (existing && existing.hash === hash) {
    return { status: "skipped", embeddingFailures: 0 };
  }

  const fileRow = upsertFile(db, projectId, relPath, hash);

  // Remove old chunks for this file before re-indexing
  deleteChunksByFile(db, fileRow.id);

  const chunks = chunkFile(code, absolutePath);
  let embeddingFailures = 0;

  for (const chunk of chunks) {
    let embedding: Float32Array | null = null;
    try {
      embedding = await embed(chunk.content, ollamaConfig);
    } catch {
      embeddingFailures++;
    }
    insertChunk(
      db,
      fileRow.id,
      projectId,
      chunk.content,
      chunk.chunkType,
      chunk.name,
      chunk.startLine,
      chunk.endLine,
      embedding
    );
  }

  return { status: "indexed", embeddingFailures };
}

/**
 * Indexes all files in a project directory.
 */
export async function indexProject(
  db: Database.Database,
  projectId: number,
  rootDir: string,
  ollamaConfig: OllamaConfig = {},
  onProgress?: (message: string, progress: number, total: number) => Promise<void>
): Promise<IndexResult> {
  if (!existsSync(rootDir)) {
    return {
      indexed: 0,
      skipped: 0,
      failed: 0,
      embeddingFailures: 0,
      errors: [`Path does not exist: "${rootDir}". If running in Docker, use the container-side path (e.g. /projects/my-repo).`],
    };
  }
  const files = collectFiles(rootDir);
  const result: IndexResultWithFiles = {
    indexed: 0,
    skipped: 0,
    failed: 0,
    embeddingFailures: 0,
    errors: [],
    indexedFiles: [],
  };
  const total = files.length;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    try {
      const outcome = await indexFile(db, projectId, rootDir, file, ollamaConfig);
      result[outcome.status]++;
      result.embeddingFailures += outcome.embeddingFailures;
      if (onProgress) {
        const rel = file.startsWith(rootDir) ? file.slice(rootDir.length).replace(/^\/|^\\/, "") : file;
        const status = outcome.status === "indexed" ? "Indexed" : outcome.status === "skipped" ? "Skipped" : "Failed";
        // Fire-and-forget to avoid blocking indexing if the client is slow or disconnected
        void onProgress(`${status} ${rel} (${i + 1}/${total})`, i + 1, total).catch(() => {
          /* ignore notification errors */
        });
      }

      if (outcome.status === "indexed") {
        const rel = file.startsWith(rootDir) ? file.slice(rootDir.length).replace(/^\/|^\\/, "") : file;
        result.indexedFiles.push(rel);
      }
    } catch (err) {
      result.failed++;
      result.errors.push(
        `${file}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  return result;
}
