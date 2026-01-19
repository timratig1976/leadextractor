import type { NextApiRequest, NextApiResponse } from "next";
import { createId, nowIso, readDb, writeDb } from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    const db = await readDb();
    return res.status(200).json({ projects: db.projects });
  }

  if (req.method === "POST") {
    const { name } = req.body as { name?: string };
    if (!name?.trim()) {
      return res.status(400).json({ error: "Project name required" });
    }

    const db = await readDb();
    const project = { id: createId("proj"), name: name.trim(), createdAt: nowIso() };
    db.projects.push(project);
    await writeDb(db);
    return res.status(201).json({ project });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
