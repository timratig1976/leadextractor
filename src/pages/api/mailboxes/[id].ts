import type { NextApiRequest, NextApiResponse } from "next";
import { readDb, writeDb } from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const mailboxId = req.query.id as string;
  const db = await readDb();
  const mailbox = db.mailboxes.find((item) => item.id === mailboxId);

  if (!mailbox) {
    return res.status(404).json({ error: "Mailbox not found" });
  }

  if (req.method === "GET") {
    const emails = db.emails.filter((item) => item.mailboxId === mailboxId);
    const parseResults = db.parseResults.reduce((acc, item) => {
      acc[item.emailId] = item;
      return acc;
    }, {} as Record<string, typeof db.parseResults[number]>);
    return res.status(200).json({ mailbox, emails, parseResults });
  }

  if (req.method === "PUT") {
    const { host, port, user, password, tls, pollingIntervalMinutes } = req.body as {
      host?: string;
      port?: number;
      user?: string;
      password?: string;
      tls?: boolean;
      pollingIntervalMinutes?: number;
    };

    mailbox.host = host?.trim() || mailbox.host;
    mailbox.port = port ?? mailbox.port;
    mailbox.user = user?.trim() || mailbox.user;
    if (typeof password === "string") {
      mailbox.password = password.trim();
    }
    mailbox.tls = tls ?? mailbox.tls;
    mailbox.pollingIntervalMinutes = pollingIntervalMinutes ?? mailbox.pollingIntervalMinutes;

    await writeDb(db);
    return res.status(200).json({ mailbox });
  }

  if (req.method === "DELETE") {
    db.mailboxes = db.mailboxes.filter((item) => item.id !== mailboxId);
    await writeDb(db);
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
