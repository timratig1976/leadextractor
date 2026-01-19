import { promises as fs } from "fs";
import path from "path";
import type { Database } from "./types";

const dataDir = path.join(process.cwd(), "data");
const dbPath = path.join(dataDir, "db.json");

const emptyDb: Database = {
  users: [],
  projects: [],
  mailboxes: [],
  emails: [],
  parseResults: [],
  classifications: [],
};

async function ensureDbFile() {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(dbPath);
  } catch {
    await fs.writeFile(dbPath, JSON.stringify(emptyDb, null, 2));
  }
}

export async function readDb(): Promise<Database> {
  await ensureDbFile();
  const raw = await fs.readFile(dbPath, "utf-8");
  const db = JSON.parse(raw) as Database;
  if (!db.classifications) {
    db.classifications = [];
  }
  return db;
}

export async function writeDb(db: Database): Promise<void> {
  await ensureDbFile();
  await fs.writeFile(dbPath, JSON.stringify(db, null, 2));
}

export function createId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function nowIso() {
  return new Date().toISOString();
}
