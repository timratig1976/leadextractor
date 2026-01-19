import type { NextApiRequest, NextApiResponse } from "next";
import { createId, nowIso, readDb, writeDb } from "@/lib/db";
import type { EmailClassification } from "@/lib/types";

const OPENAI_MODEL_FALLBACK = "gpt-4o-mini";
const CEREBRAS_MODEL_FALLBACK = "gpt-oss-120b";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const emailId = req.query.id as string;
  const provider: "openai" | "cerebras" =
    (req.query.provider as string) === "cerebras" ? "cerebras" : "openai";
  const openAiKey = process.env.OPENAI_API_KEY;
  const cerebrasKey = process.env.CEREBRAS_API_KEY;
  const model =
    provider === "cerebras"
      ? process.env.CEREBRAS_MODEL || CEREBRAS_MODEL_FALLBACK
      : process.env.OPENAI_MODEL || OPENAI_MODEL_FALLBACK;

  if (provider === "cerebras" && !cerebrasKey) {
    return res.status(500).json({ error: "CEREBRAS_API_KEY not configured" });
  }

  if (provider === "openai" && !openAiKey) {
    return res.status(500).json({ error: "OPENAI_API_KEY not configured" });
  }

  const db = await readDb();
  const email = db.emails.find((item) => item.id === emailId);

  if (!email) {
    return res.status(404).json({ error: "Email not found" });
  }

  const messages = [
    { role: "system", content: "You are a strict JSON API. Output JSON only." },
    {
      role: "user",
      content: [
        "Classify this email into one of the categories:",
        "- lead_request (customer asking for a lead)",
        "- lead_source (lead from a source like Immowelt, etc.)",
        "- normal (not a lead)",
        "Return strict JSON only with fields: category, source, confidence.",
        "If category is lead_source, set source to the provider name. Otherwise source is null.",
        "confidence should be a number 0-1.",
        "Email:",
        `From: ${email.sender}`,
        `Subject: ${email.subject}`,
        `Body: ${email.body}`,
      ].join("\n"),
    },
  ];

  try {
    const startTime = Date.now();
    const url =
      provider === "cerebras"
        ? "https://api.cerebras.ai/v1/chat/completions"
        : "https://api.openai.com/v1/chat/completions";
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${provider === "cerebras" ? cerebrasKey : openAiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: provider === "cerebras" ? 1 : 0.2,
        max_completion_tokens: provider === "cerebras" ? 32768 : undefined,
        top_p: provider === "cerebras" ? 1 : undefined,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(500).json({ error: `${provider} error: ${errorText}` });
    }

    const data = await response.json();
    const latencyMs = Date.now() - startTime;
    const message = data.choices?.[0]?.message?.content ?? "";
    const usage = data.usage as {
      prompt_tokens?: number;
      completion_tokens?: number;
      total_tokens?: number;
    };
    const parsed = JSON.parse(message) as {
      category: "lead_request" | "lead_source" | "normal";
      source: string | null;
      confidence: number;
    };

    const classification: EmailClassification = {
      id: createId("classify"),
      emailId: email.id,
      category: parsed.category,
      source: parsed.source ?? null,
      confidence: Number(parsed.confidence) || 0,
      log: {
        provider: provider === "cerebras" ? "cerebras" : "openai",
        model,
        messages,
        responseText: message,
        latencyMs,
        usage: usage
          ? {
              promptTokens: usage.prompt_tokens ?? 0,
              completionTokens: usage.completion_tokens ?? 0,
              totalTokens: usage.total_tokens ?? 0,
            }
          : undefined,
      },
      createdAt: nowIso(),
    };

    db.classifications = db.classifications.filter((item) => item.emailId !== email.id);
    db.classifications.push(classification);
    await writeDb(db);

    return res.status(200).json({ classification });
  } catch (error) {
    return res.status(500).json({ error: `Classification failed: ${(error as Error).message}` });
  }
}
