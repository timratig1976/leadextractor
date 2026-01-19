import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

type Mailbox = {
  id: string;
  host: string;
  port: number;
  user: string;
  tls: boolean;
  pollingIntervalMinutes: number;
  createdAt: string;
};

type EmailRecord = {
  id: string;
  mailboxId: string;
  subject: string;
  sender: string;
  body: string;
  receivedAt: string;
};

type ParseResult = {
  emailId: string;
  lead: boolean;
  confidence: number;
  fields: Record<string, string | number | boolean | null>;
};

type EmailClassification = {
  emailId: string;
  category: "lead_request" | "lead_source" | "normal";
  source: string | null;
  confidence: number;
  contactEmail?: string | null;
  contactName?: {
    firstName: string | null;
    lastName: string | null;
  };
  company?: {
    name: string | null;
    domain: string | null;
    url: string | null;
    address: string | null;
  };
  phones?: string[];
  requestText?: string | null;
  log?: {
    provider: "openai" | "cerebras";
    model: string;
    messages: Array<{ role: string; content: string }>;
    responseText: string;
    latencyMs?: number;
    usage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
  };
};

const INPUT_COST_PER_TOKEN = 0.15 / 1_000_000;
const OUTPUT_COST_PER_TOKEN = 0.6 / 1_000_000;

export default function MailboxDetailPage() {
  const router = useRouter();
  const { id, mailboxId } = router.query;
  const projectId = Array.isArray(id) ? id[0] : id;
  const mailboxKey = Array.isArray(mailboxId) ? mailboxId[0] : mailboxId;

  const [mailbox, setMailbox] = useState<Mailbox | null>(null);
  const [emails, setEmails] = useState<EmailRecord[]>([]);
  const [results, setResults] = useState<Record<string, ParseResult>>({});
  const [classifications, setClassifications] = useState<Record<string, EmailClassification>>(
    {}
  );
  const [testStatus, setTestStatus] = useState<string>("");
  const [syncStatus, setSyncStatus] = useState<string>("");
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [classifyStatus, setClassifyStatus] = useState<string>("");
  const [logEmailId, setLogEmailId] = useState<string | null>(null);
  const [bulkStatus, setBulkStatus] = useState<string>("");
  const [bulkUsage, setBulkUsage] = useState<{
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    costUsd: number | null;
    averageLatencyMs?: number;
    maxLatencyMs?: number;
  } | null>(null);
  const [provider, setProvider] = useState<"openai" | "cerebras">("openai");
  const [clearStatus, setClearStatus] = useState<string>("");

  const loadMailbox = async () => {
    if (!mailboxKey) return;
    const response = await fetch(`/api/mailboxes/${mailboxKey}`);
    const data = await response.json();
    setMailbox(data.mailbox);
    setEmails(data.emails ?? []);
    setResults(data.parseResults ?? {});
    setClassifications(data.classifications ?? {});
  };

  useEffect(() => {
    void loadMailbox();
  }, [mailboxKey]);

  const handleTestConnection = async () => {
    if (!mailboxKey) return;
    setTestStatus("Testing...");
    const response = await fetch(`/api/mailboxes/${mailboxKey}/test`, {
      method: "POST",
    });
    const data = await response.json();
    if (response.ok) {
      setTestStatus(data.message);
    } else {
      setTestStatus(data.error);
    }
  };

  const handleClearEmails = async () => {
    if (!mailboxKey) return;
    setClearStatus("Clearing emails...");
    const response = await fetch(`/api/mailboxes/${mailboxKey}/clear`, { method: "POST" });
    const data = await response.json();
    if (response.ok) {
      setClearStatus(`Cleared ${data.cleared} emails.`);
      await loadMailbox();
    } else {
      setClearStatus(data.error ?? "Clear failed.");
    }
  };

  const handleBulkClassify = async () => {
    if (!mailboxKey) return;
    setBulkStatus("Classifying all emails...");
    setBulkUsage(null);
    const response = await fetch(`/api/mailboxes/${mailboxKey}/classify?provider=${provider}`, {
      method: "POST",
    });
    const data = await response.json();
    if (response.ok) {
      setBulkStatus(`Classified ${data.processed} of ${data.total} emails.`);
      if (data.usage) {
        setBulkUsage({
          promptTokens: data.usage.promptTokens ?? 0,
          completionTokens: data.usage.completionTokens ?? 0,
          totalTokens: data.usage.totalTokens ?? 0,
          costUsd: data.costUsd ?? null,
          averageLatencyMs: data.latency?.averageMs ?? 0,
          maxLatencyMs: data.latency?.maxMs ?? 0,
        });
      }
      await loadMailbox();
    } else {
      setBulkStatus(data.error ?? "Bulk classification failed.");
    }
  };

  const handleClassifyEmail = async (emailId: string) => {
    setClassifyStatus("Classifying...");
    const response = await fetch(`/api/emails/${emailId}/classify?provider=${provider}`, {
      method: "POST",
    });
    const data = await response.json();
    if (response.ok) {
      setClassifyStatus("Classification complete.");
      setClassifications((current) => ({
        ...current,
        [emailId]: data.classification,
      }));
    } else {
      setClassifyStatus(data.error ?? "Classification failed.");
    }
  };

  const handleSyncEmails = async () => {
    if (!mailboxKey) return;
    setSyncStatus("Fetching emails...");
    const response = await fetch(`/api/mailboxes/${mailboxKey}/sync`, {
      method: "POST",
    });
    const data = await response.json();
    if (response.ok) {
      setSyncStatus(data.message ?? "Emails fetched.");
      await loadMailbox();
    } else {
      setSyncStatus(data.error ?? "Fetch failed.");
    }
  };

  return (
    <>
      <Head>
        <title>Lead Extractor | Mailbox</title>
      </Head>
      <main className="page">
        <section className="card wide">
          <header className="cardHeader">
            <div>
              <h1>{mailbox?.user ?? "Mailbox"}</h1>
              <p>Connection details and parsed emails.</p>
            </div>
            <div className="actions">
              <Link className="secondary" href={`/projects/${projectId}`}>
                Back to project
              </Link>
            </div>
          </header>

          <div className="section">
            <div className="grid">
              <div className="tile">
                <h3>IMAP Host</h3>
                <p>{mailbox ? `${mailbox.host}:${mailbox.port}` : "—"}</p>
              </div>
              <div className="tile">
                <h3>TLS</h3>
                <p>{mailbox?.tls ? "Enabled" : "Disabled"}</p>
              </div>
              <div className="tile">
                <h3>Polling</h3>
                <p>{mailbox ? `Every ${mailbox.pollingIntervalMinutes} min` : "—"}</p>
              </div>
              <div className="tile">
                <h3>Connection</h3>
                <button type="button" onClick={handleTestConnection}>
                  Test connection
                </button>
                {testStatus ? <p className="muted">{testStatus}</p> : null}
              </div>
              <div className="tile">
                <h3>Sync Inbox</h3>
                <button type="button" onClick={handleSyncEmails}>
                  Fetch latest emails
                </button>
                {syncStatus ? <p className="muted">{syncStatus}</p> : null}
              </div>
            </div>
          </div>

          <div className="section">
            <div className="sectionHeader">
              <h2>Mailbox Emails</h2>
              <div className="sectionActions">
                <label className="toggle">
                  <span>Provider</span>
                  <select
                    value={provider}
                    onChange={(event) =>
                      setProvider(event.target.value === "cerebras" ? "cerebras" : "openai")
                    }
                  >
                    <option value="openai">OpenAI</option>
                    <option value="cerebras">Cerebras</option>
                  </select>
                </label>
                <button type="button" onClick={handleBulkClassify}>
                  Bulk classify emails
                </button>
                <button type="button" className="secondary" onClick={handleClearEmails}>
                  Clear emails
                </button>
                {clearStatus ? <span className="muted">{clearStatus}</span> : null}
                {bulkStatus ? (
                  <span className="muted">
                    {bulkStatus}
                    {bulkUsage ? (
                      <> 
                        · Tokens {bulkUsage.totalTokens} (prompt {bulkUsage.promptTokens}, output {bulkUsage.completionTokens})
                        · Cost {bulkUsage.costUsd !== null ? `$${bulkUsage.costUsd.toFixed(4)}` : "—"}
                        · Latency avg {bulkUsage.averageLatencyMs}ms / max {bulkUsage.maxLatencyMs}ms
                      </>
                    ) : null}
                  </span>
                ) : null}
              </div>
            </div>
            <div className="table mailboxTable">
              <div className="tableHeader">
                <span>From</span>
                <span>Subject</span>
                <span>Lead</span>
                <span>Confidence</span>
                <span>Type</span>
              </div>
              {emails.length === 0 ? (
                <p className="muted">No emails ingested yet.</p>
              ) : (
                emails.map((email) => {
                  const result = results[email.id];
                  const classification = classifications[email.id];
                  const isSelected = selectedEmailId === email.id;
                  const usage = classification?.log?.usage;
                  const latencyMs = classification?.log?.latencyMs;
                  const costUsd = usage
                    ? usage.promptTokens * INPUT_COST_PER_TOKEN +
                      usage.completionTokens * OUTPUT_COST_PER_TOKEN
                    : null;
                  const leadValue = classification
                    ? classification.category === "lead_request" ||
                      classification.category === "lead_source"
                      ? "Yes"
                      : "No"
                    : result?.lead
                      ? "Yes"
                      : "No";
                  return (
                    <div key={email.id} className="tableRowGroup">
                      <div
                        className={`tableRow ${isSelected ? "active" : ""}`}
                        role="button"
                        tabIndex={0}
                        onClick={() =>
                          setSelectedEmailId((current) => (current === email.id ? null : email.id))
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setSelectedEmailId((current) =>
                              current === email.id ? null : email.id
                            );
                          }
                        }}
                      >
                        <span>{email.sender}</span>
                        <span>{email.subject}</span>
                        <span>{leadValue}</span>
                        <span>{result ? `${Math.round(result.confidence * 100)}%` : "—"}</span>
                        <span>{classification?.category ?? "—"}</span>
                      </div>
                      {isSelected ? (
                        <div
                          className="tableDetail"
                          onClick={(event) => event.stopPropagation()}
                          onKeyDown={(event) => event.stopPropagation()}
                        >
                          <div className="detailPanels">
                            <div className="detailPanel contentPanel">
                              <p className="muted">Email content</p>
                              <pre>{email.body || "No content available."}</pre>
                            </div>
                            <div className="detailPanel aiPanel">
                              <p className="muted">AI classification</p>
                              <div className="detailActions">
                                <button type="button" onClick={() => handleClassifyEmail(email.id)}>
                                  Test OpenAI classification
                                </button>
                                {classifyStatus ? (
                                  <span className="muted">{classifyStatus}</span>
                                ) : null}
                              </div>
                              {classification ? (
                                <div className="detailMeta">
                                  <p>
                                    <strong>Contact:</strong>{" "}
                                    {[classification.contactName?.firstName, classification.contactName?.lastName]
                                      .filter(Boolean)
                                      .join(" ") || "—"}
                                  </p>
                                  <p>
                                    <strong>Contact Email:</strong> {classification.contactEmail ?? "—"}
                                  </p>
                                  <p>
                                    <strong>Company:</strong> {classification.company?.name ?? "—"}
                                  </p>
                                  <p>
                                    <strong>Company URL:</strong> {classification.company?.url ?? "—"}
                                  </p>
                                  <p>
                                    <strong>Company Domain:</strong> {classification.company?.domain ?? "—"}
                                  </p>
                                  <p>
                                    <strong>Company Address:</strong> {classification.company?.address ?? "—"}
                                  </p>
                                  <p>
                                    <strong>Phones:</strong>{" "}
                                    {classification.phones && classification.phones.length > 0
                                      ? classification.phones.join(", ")
                                      : "—"}
                                  </p>
                                  <p>
                                    <strong>Request:</strong> {classification.requestText ?? "—"}
                                  </p>
                                  {classification.log ? (
                                    <button
                                      type="button"
                                      className="secondary"
                                      onClick={() => setLogEmailId(email.id)}
                                    >
                                      View AI prompt &amp; response
                                    </button>
                                  ) : null}
                                </div>
                              ) : (
                                <p className="muted">No AI result yet.</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>
        {logEmailId ? (
          <div className="modalOverlay" role="dialog" aria-modal="true">
            <div className="modalCard">
              <div className="modalHeader">
                <div>
                  <h3>AI prompt &amp; response</h3>
                  <p className="muted">Email {logEmailId}</p>
                </div>
                <button type="button" className="secondary" onClick={() => setLogEmailId(null)}>
                  Close
                </button>
              </div>
              {logEmailId && classifications[logEmailId]?.log ? (
                <div className="modalBody">
                  <p>
                    <strong>Model:</strong> {classifications[logEmailId]?.log?.model}
                  </p>
                  {classifications[logEmailId]?.log?.provider ? (
                    <p>
                      <strong>Provider:</strong> {classifications[logEmailId]?.log?.provider}
                    </p>
                  ) : null}
                  {classifications[logEmailId]?.log?.latencyMs ? (
                    <p>
                      <strong>Latency:</strong> {classifications[logEmailId]?.log?.latencyMs}ms
                    </p>
                  ) : null}
                  <p className="muted">Messages</p>
                  {classifications[logEmailId]?.log?.messages.map((message, index) => (
                    <div key={`${message.role}-${index}`} className="logMessage">
                      <p>
                        <strong>{message.role}:</strong>
                      </p>
                      <pre>{message.content}</pre>
                    </div>
                  ))}
                  <p className="muted">Raw response</p>
                  <pre>{classifications[logEmailId]?.log?.responseText}</pre>
                </div>
              ) : (
                <p className="muted">No log data available.</p>
              )}
            </div>
          </div>
        ) : null}
      </main>
    </>
  );
}
