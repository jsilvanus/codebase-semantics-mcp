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
