import type { NextApiRequest, NextApiResponse } from "next";
import { readDb } from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const projectId = req.query.id as string;
  const db = await readDb();
  const mailboxes = db.mailboxes.filter((item) => item.projectId === projectId);
  const mailboxIds = new Set(mailboxes.map((item) => item.id));

  if (req.method === "GET") {
    const emails = db.emails.filter((item) => mailboxIds.has(item.mailboxId));
    const parseResults = db.parseResults.reduce((acc, item) => {
      acc[item.emailId] = item;
      return acc;
    }, {} as Record<string, typeof db.parseResults[number]>);
    return res.status(200).json({ emails, parseResults });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
