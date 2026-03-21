import {
  insertProject,
  getProjectByName,
  getAllProjects,
  deleteProject as dbDeleteProject,
  type ProjectRow,
} from "../db/sqlite.js";
import type Database from "better-sqlite3";

export type { ProjectRow };

export function createProject(
  db: Database.Database,
  name: string,
  projectPath: string
): ProjectRow {
  const existing = getProjectByName(db, name);
  if (existing) return existing;
  return insertProject(db, name, projectPath);
}

export function getProject(
  db: Database.Database,
  name: string
): ProjectRow | undefined {
  return getProjectByName(db, name);
}

export function listProjects(db: Database.Database): ProjectRow[] {
  return getAllProjects(db);
}

export function removeProject(
  db: Database.Database,
  name: string
): boolean {
  return dbDeleteProject(db, name);
}
