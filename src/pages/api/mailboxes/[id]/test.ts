import type { NextApiRequest, NextApiResponse } from "next";
import { ImapFlow } from "imapflow";
import { readDb } from "@/lib/db";

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
      details: "Host, user, and password are required to test the connection.",
    });
  }

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
    await client.logout();
    return res.status(200).json({
      ok: true,
      message: "Connection successful. IMAP login verified.",
    });
  } catch (error) {
    return res.status(400).json({
      ok: false,
      error: "Connection failed.",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
