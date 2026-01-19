import type { NextApiRequest, NextApiResponse } from "next";
import { createId, nowIso, readDb, writeDb } from "@/lib/db";

const OPENAI_MODEL_FALLBACK = "gpt-4o-mini";
const CEREBRAS_MODEL_FALLBACK = "gpt-oss-120b";

type ClassificationResult = {
  category: "lead_request" | "lead_source" | "normal";
  source: string | null;
  confidence: number;
};

async function classifyEmail(
  provider: "openai" | "cerebras",
  apiKey: string,
  model: string,
  email: {
  sender: string;
  subject: string;
  body: string;
  }
) {
  const messages = [
    { role: "system", content: "You are a strict JSON API. Output JSON only." },
    {
      role: "user",
      content: [
        "Classify this email into one of the categories:",
        "- lead_request (customer asking for a lead)",
        "- lead_source (lead from a source like Immowelt, etc.)",
        "- normal (not a lead)",
        "Return strict JSON only with fields:",
        "category, source, confidence,",
        "contact_email,",
        "contact_name { first_name, last_name },",
        "company { name, domain, url, address },",
        "phones (array of strings),",
        "request_text.",
        "If category is lead_source, set source to the provider name. Otherwise source is null.",
        "If a field is missing, return null (or empty array for phones).",
        "confidence should be a number 0-1.",
        "Email:",
        `From: ${email.sender}`,
        `Subject: ${email.subject}`,
        `Body: ${email.body}`,
      ].join("\n"),
    },
  ];

  const startTime = Date.now();
  const url =
    provider === "cerebras"
      ? "https://api.cerebras.ai/v1/chat/completions"
      : "https://api.openai.com/v1/chat/completions";
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
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
    throw new Error(`${provider} error: ${errorText}`);
  }

  const data = await response.json();
  const latencyMs = Date.now() - startTime;
  const message = data.choices?.[0]?.message?.content ?? "";
  const usage = data.usage as {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  const parsed = JSON.parse(message) as ClassificationResult & {
    contact_email?: string | null;
    contact_name?: { first_name: string | null; last_name: string | null } | null;
    company?: {
      name: string | null;
      domain: string | null;
      url: string | null;
      address: string | null;
    } | null;
    phones?: string[] | null;
    request_text?: string | null;
  };

  return { parsed, messages, responseText: message, usage, latencyMs };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const mailboxId = req.query.id as string;
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
  const mailbox = db.mailboxes.find((item) => item.id === mailboxId);

  if (!mailbox) {
    return res.status(404).json({ error: "Mailbox not found" });
  }

  const emails = db.emails.filter((item) => item.mailboxId === mailboxId);
  let processed = 0;
  let promptTokens = 0;
  let completionTokens = 0;
  let totalLatencyMs = 0;
  let maxLatencyMs = 0;

  const inputCostPerToken = 0.15 / 1_000_000;
  const outputCostPerToken = 0.6 / 1_000_000;

  for (const email of emails) {
    try {
      const apiKey = provider === "cerebras" ? cerebrasKey : openAiKey;
      const { parsed, messages, responseText, usage, latencyMs } = await classifyEmail(
        provider,
        apiKey as string,
        model,
        email
      );
      if (usage) {
        promptTokens += usage.prompt_tokens ?? 0;
        completionTokens += usage.completion_tokens ?? 0;
      }
      totalLatencyMs += latencyMs;
      if (latencyMs > maxLatencyMs) {
        maxLatencyMs = latencyMs;
      }
      db.classifications = db.classifications.filter((item) => item.emailId !== email.id);
      db.classifications.push({
        id: createId("classify"),
        emailId: email.id,
        category: parsed.category,
        source: parsed.source ?? null,
        confidence: Number(parsed.confidence) || 0,
        contactEmail: parsed.contact_email ?? null,
        contactName: parsed.contact_name
          ? {
              firstName: parsed.contact_name.first_name ?? null,
              lastName: parsed.contact_name.last_name ?? null,
            }
          : undefined,
        company: parsed.company
          ? {
              name: parsed.company.name ?? null,
              domain: parsed.company.domain ?? null,
              url: parsed.company.url ?? null,
              address: parsed.company.address ?? null,
            }
          : undefined,
        phones: parsed.phones ?? [],
        requestText: parsed.request_text ?? null,
        log: {
          provider,
          model,
          messages,
          responseText,
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
      });
      processed += 1;
    } catch {
      // ignore individual failures
    }
  }

  await writeDb(db);
  const totalTokens = promptTokens + completionTokens;
  const costUsd =
    provider === "openai"
      ? promptTokens * inputCostPerToken + completionTokens * outputCostPerToken
      : null;
  const averageLatencyMs = processed > 0 ? Math.round(totalLatencyMs / processed) : 0;
  return res.status(200).json({
    processed,
    total: emails.length,
    usage: {
      promptTokens,
      completionTokens,
      totalTokens,
    },
    latency: {
      averageMs: averageLatencyMs,
      maxMs: maxLatencyMs,
    },
    costUsd,
    provider,
    model,
  });
}
