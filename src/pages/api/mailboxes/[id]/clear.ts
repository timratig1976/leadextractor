import type { NextApiRequest, NextApiResponse } from "next";
import { readDb, writeDb } from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const mailboxId = req.query.id as string;
  const db = await readDb();
  const mailbox = db.mailboxes.find((item) => item.id === mailboxId);

  if (!mailbox) {
    return res.status(404).json({ error: "Mailbox not found" });
  }

  const emailIds = new Set(db.emails.filter((item) => item.mailboxId === mailboxId).map((item) => item.id));
  db.emails = db.emails.filter((item) => item.mailboxId !== mailboxId);
  db.parseResults = db.parseResults.filter((item) => !emailIds.has(item.emailId));
  db.classifications = db.classifications.filter((item) => !emailIds.has(item.emailId));

  await writeDb(db);
  return res.status(200).json({ ok: true, cleared: emailIds.size });
}
