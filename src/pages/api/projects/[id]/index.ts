import type { NextApiRequest, NextApiResponse } from "next";
import { readDb, writeDb } from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const projectId = req.query.id as string;
  const db = await readDb();
  const project = db.projects.find((item) => item.id === projectId);

  if (!project) {
    return res.status(404).json({ error: "Project not found" });
  }

  if (req.method === "GET") {
    return res.status(200).json({ project });
  }

  if (req.method === "PUT") {
    const { name } = req.body as { name?: string };
    if (!name?.trim()) {
      return res.status(400).json({ error: "Project name required" });
    }
    project.name = name.trim();
    await writeDb(db);
    return res.status(200).json({ project });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
