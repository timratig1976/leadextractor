import type { NextApiRequest, NextApiResponse } from "next";
import { ImapFlow } from "imapflow";
import { createId, nowIso, readDb, writeDb } from "@/lib/db";

const DEFAULT_LIMIT = 5;

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

  if (!mailbox.host?.trim() || !mailbox.user?.trim() || !mailbox.password?.trim()) {
    return res.status(400).json({
      error: "Missing mailbox credentials",
      details: "Host, user, and password are required to fetch mail.",
    });
  }

  const limit = Math.max(1, Number(req.query.limit ?? DEFAULT_LIMIT));

  const client = new ImapFlow({
    host: mailbox.host,
    port: mailbox.port,
    secure: mailbox.tls,
    auth: {
      user: mailbox.user,
      pass: mailbox.password,
    },
    logger: false,
  });

  try {
    await client.connect();
    const status = await client.status("INBOX", { messages: true });
    const total = status?.messages ?? 0;
    if (!total) {
      return res.status(200).json({ ok: true, fetched: 0, message: "No emails found." });
    }

    const lock = await client.getMailboxLock("INBOX");
    try {
      const start = Math.max(total - limit + 1, 1);
      const range = `${start}:*`;
      let fetched = 0;

      for await (const message of client.fetch(range, { envelope: true, source: true })) {
        const from = message.envelope?.from?.[0]?.address ?? "unknown";
        const subject = message.envelope?.subject ?? "(no subject)";
        const receivedAt = message.envelope?.date
          ? new Date(message.envelope.date).toISOString()
          : nowIso();
        const bodyPreview = message.source
          ? message.source.toString("utf-8").slice(0, 500)
          : "";

        db.emails.push({
          id: createId("eml"),
          mailboxId,
          sender: from,
          subject,
          body: bodyPreview,
          receivedAt,
        });
        fetched += 1;
      }

      await writeDb(db);
      return res.status(200).json({ ok: true, fetched, message: `Fetched ${fetched} emails.` });
    } finally {
      lock.release();
    }
  } catch (error) {
    return res.status(400).json({
      ok: false,
      error: "Fetch failed.",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  } finally {
    await client.logout().catch(() => null);
  }
}
