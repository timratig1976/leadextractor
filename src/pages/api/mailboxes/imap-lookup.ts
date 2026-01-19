import type { NextApiRequest, NextApiResponse } from "next";
import { lookupImapHost } from "@/lib/imap";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const email = typeof req.query.email === "string" ? req.query.email : "";
  if (!email.trim()) {
    return res.status(400).json({ error: "Email is required" });
  }

  const result = await lookupImapHost(email.trim());
  return res.status(200).json(result);
}
