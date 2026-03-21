import Database from "better-sqlite3";

const SCHEMA = `
-- Projects table: one row per indexed project
CREATE TABLE IF NOT EXISTS projects (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL UNIQUE,
  path        TEXT    NOT NULL,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Files table: tracks which files have been indexed and their content hash
CREATE TABLE IF NOT EXISTS files (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  path        TEXT    NOT NULL,
  hash        TEXT    NOT NULL,
  indexed_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE(project_id, path)
);

-- Chunks table: stores AST-aware code chunks with embeddings
CREATE TABLE IF NOT EXISTS chunks (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  file_id     INTEGER NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  project_id  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  content     TEXT    NOT NULL,
  chunk_type  TEXT    NOT NULL,
  name        TEXT,
  start_line  INTEGER,
  end_line    INTEGER,
  embedding   BLOB
);

CREATE INDEX IF NOT EXISTS idx_chunks_project ON chunks(project_id);
CREATE INDEX IF NOT EXISTS idx_files_project  ON files(project_id);
`;

let _db: Database.Database | null = null;

export function getDb(dbPath: string): Database.Database {
  if (_db) return _db;

  _db = new Database(dbPath);
  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");
  _db.exec(SCHEMA);

  return _db;
}

export function closeDb(): void {
  if (_db) {
    _db.close();
    _db = null;
  }
}

// ── Projects ────────────────────────────────────────────────────────────────

export interface ProjectRow {
  id: number;
  name: string;
  path: string;
  created_at: string;
}

export function insertProject(
  db: Database.Database,
  name: string,
  path: string
): ProjectRow {
  const stmt = db.prepare(
    "INSERT INTO projects (name, path) VALUES (?, ?) RETURNING *"
  );
  return stmt.get(name, path) as ProjectRow;
}

export function getProjectByName(
  db: Database.Database,
  name: string
): ProjectRow | undefined {
  return db
    .prepare("SELECT * FROM projects WHERE name = ?")
    .get(name) as ProjectRow | undefined;
}

export function getAllProjects(db: Database.Database): ProjectRow[] {
  return db.prepare("SELECT * FROM projects ORDER BY name").all() as ProjectRow[];
}

export function deleteProject(db: Database.Database, name: string): boolean {
  const result = db
    .prepare("DELETE FROM projects WHERE name = ?")
    .run(name);
  return result.changes > 0;
}

// ── Files ────────────────────────────────────────────────────────────────────

export interface FileRow {
  id: number;
  project_id: number;
  path: string;
  hash: string;
  indexed_at: string;
}

export function upsertFile(
  db: Database.Database,
  projectId: number,
  filePath: string,
  hash: string
): FileRow {
  db.prepare(
    `INSERT INTO files (project_id, path, hash, indexed_at)
     VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT(project_id, path) DO UPDATE
       SET hash = excluded.hash, indexed_at = excluded.indexed_at`
  ).run(projectId, filePath, hash);

  return db
    .prepare("SELECT * FROM files WHERE project_id = ? AND path = ?")
    .get(projectId, filePath) as FileRow;
}

export function getFile(
  db: Database.Database,
  projectId: number,
  filePath: string
): FileRow | undefined {
  return db
    .prepare("SELECT * FROM files WHERE project_id = ? AND path = ?")
    .get(projectId, filePath) as FileRow | undefined;
}

export function getFilesByProject(
  db: Database.Database,
  projectId: number
): FileRow[] {
  return db
    .prepare("SELECT * FROM files WHERE project_id = ?")
    .all(projectId) as FileRow[];
}

// ── Chunks ───────────────────────────────────────────────────────────────────

export interface ChunkRow {
  id: number;
  file_id: number;
  project_id: number;
  content: string;
  chunk_type: string;
  name: string | null;
  start_line: number | null;
  end_line: number | null;
  embedding: Buffer | null;
}

export function deleteChunksByFile(
  db: Database.Database,
  fileId: number
): void {
  db.prepare("DELETE FROM chunks WHERE file_id = ?").run(fileId);
}

export function insertChunk(
  db: Database.Database,
  fileId: number,
  projectId: number,
  content: string,
  chunkType: string,
  name: string | null,
  startLine: number | null,
  endLine: number | null,
  embedding: Float32Array | null
): number {
  const blob = embedding ? Buffer.from(embedding.buffer) : null;
  const result = db
    .prepare(
      `INSERT INTO chunks
         (file_id, project_id, content, chunk_type, name, start_line, end_line, embedding)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(fileId, projectId, content, chunkType, name, startLine, endLine, blob);
  return result.lastInsertRowid as number;
}

export function getChunksByProject(
  db: Database.Database,
  projectId: number
): ChunkRow[] {
  return db
    .prepare("SELECT * FROM chunks WHERE project_id = ?")
    .all(projectId) as ChunkRow[];
}

export interface ProjectStats {
  fileCount: number;
  chunkCount: number;
}

export function getProjectStats(
  db: Database.Database,
  projectId: number
): ProjectStats {
  const fileCount = (
    db
      .prepare("SELECT COUNT(*) as cnt FROM files WHERE project_id = ?")
      .get(projectId) as { cnt: number }
  ).cnt;
  const chunkCount = (
    db
      .prepare("SELECT COUNT(*) as cnt FROM chunks WHERE project_id = ?")
      .get(projectId) as { cnt: number }
  ).cnt;
  return { fileCount, chunkCount };
}
