import type { NextApiRequest, NextApiResponse } from "next";
import { createId, nowIso, readDb, writeDb } from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const projectId = req.query.id as string;
  const db = await readDb();
  const project = db.projects.find((item) => item.id === projectId);

  if (!project) {
    return res.status(404).json({ error: "Project not found" });
  }

  if (req.method === "GET") {
    const mailboxes = db.mailboxes.filter((item) => item.projectId === projectId);
    return res.status(200).json({ mailboxes });
  }

  if (req.method === "POST") {
    const { host, port, user, password, tls, pollingIntervalMinutes } = req.body as {
      host?: string;
      port?: number;
      user?: string;
      password?: string;
      tls?: boolean;
      pollingIntervalMinutes?: number;
    };

    if (!host?.trim() || !user?.trim()) {
      return res.status(400).json({ error: "Host and user required" });
    }

    const mailbox = {
      id: createId("mbx"),
      projectId,
      host: host.trim(),
      port: port ?? 993,
      user: user.trim(),
      password: password?.trim(),
      tls: tls ?? true,
      pollingIntervalMinutes: pollingIntervalMinutes ?? 30,
      createdAt: nowIso(),
    };

    db.mailboxes.push(mailbox);
    await writeDb(db);
    return res.status(201).json({ mailbox });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
