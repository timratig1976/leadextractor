import type { NextApiRequest, NextApiResponse } from "next";
import { createId, nowIso, readDb, writeDb } from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { mailboxId, subject, sender, body, receivedAt, parse } = req.body as {
    mailboxId?: string;
    subject?: string;
    sender?: string;
    body?: string;
    receivedAt?: string;
    parse?: {
      lead?: boolean;
      confidence?: number;
      fields?: Record<string, string | number | boolean | null>;
    };
  };

  if (!mailboxId || !subject || !sender) {
    return res.status(400).json({ error: "mailboxId, subject, sender required" });
  }

  const db = await readDb();
  const mailbox = db.mailboxes.find((item) => item.id === mailboxId);
  if (!mailbox) {
    return res.status(404).json({ error: "Mailbox not found" });
  }

  const email = {
    id: createId("email"),
    mailboxId,
    subject,
    sender,
    body: body ?? "",
    receivedAt: receivedAt ?? nowIso(),
  };

  db.emails.push(email);

  if (parse) {
    db.parseResults.push({
      id: createId("parse"),
      emailId: email.id,
      lead: parse.lead ?? false,
      confidence: parse.confidence ?? 0,
      fields: parse.fields ?? {},
      createdAt: nowIso(),
    });
  }

  await writeDb(db);
  return res.status(201).json({ email });
}
