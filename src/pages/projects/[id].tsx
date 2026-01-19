import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

type Project = {
  id: string;
  name: string;
  createdAt: string;
};

type Mailbox = {
  id: string;
  host: string;
  port: number;
  user: string;
  password?: string;
  tls: boolean;
  pollingIntervalMinutes: number;
  createdAt: string;
};

type EmailRecord = {
  id: string;
  mailboxId: string;
  subject: string;
  sender: string;
  receivedAt: string;
};

type ParseResult = {
  emailId: string;
  lead: boolean;
  confidence: number;
  fields: Record<string, string | number | boolean | null>;
};

export default function ProjectDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const projectId = Array.isArray(id) ? id[0] : id;

  const [project, setProject] = useState<Project | null>(null);
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([]);
  const [emails, setEmails] = useState<EmailRecord[]>([]);
  const [results, setResults] = useState<Record<string, ParseResult>>({});

  const [mailboxForm, setMailboxForm] = useState({
    host: "",
    port: 993,
    user: "",
    password: "",
    tls: true,
    pollingIntervalMinutes: 30,
  });

  const [lookupStatus, setLookupStatus] = useState<"idle" | "loading" | "done" | "error">(
    "idle"
  );
  const [lookupMessage, setLookupMessage] = useState<string>("");

  const loadProject = async () => {
    if (!projectId) return;
    const response = await fetch(`/api/projects/${projectId}`);
    const data = await response.json();
    setProject(data.project);
  };

  const runLookup = async (email: string, source: "auto" | "manual") => {
    const domain = email.split("@")[1];
    if (!domain) return;

    setLookupStatus("loading");
    setLookupMessage(source === "manual" ? "Looking up IMAP settings..." : "Auto-detecting...");
    const response = await fetch(`/api/mailboxes/imap-lookup?email=${encodeURIComponent(email)}`);
    if (!response.ok) {
      setLookupStatus("error");
      setLookupMessage("Lookup failed. Check the email domain.");
      return;
    }

    const data = await response.json();
    if (data.host) {
      setMailboxForm((current) => ({
        ...current,
        host: data.host,
        port: typeof data.port === "number" ? data.port : current.port,
      }));
      setLookupStatus("done");
      setLookupMessage(`Detected ${data.host}${data.port ? ":" + data.port : ""}`);
    } else {
      setLookupStatus("error");
      setLookupMessage("No IMAP host found for this domain.");
    }
  };

  const handleUserChange = async (value: string) => {
    setMailboxForm((current) => ({ ...current, user: value }));
    if (!mailboxForm.host && value.includes("@")) {
      await runLookup(value, "auto");
    }
  };

  const loadMailboxes = async () => {
    if (!projectId) return;
    const response = await fetch(`/api/projects/${projectId}/mailboxes`);
    const data = await response.json();
    setMailboxes(data.mailboxes);
  };

  const loadEmails = async () => {
    if (!projectId) return;
    const response = await fetch(`/api/projects/${projectId}/emails`);
    const data = await response.json();
    setEmails(data.emails);
    setResults(data.parseResults);
  };

  useEffect(() => {
    void loadProject();
    void loadMailboxes();
    void loadEmails();
  }, [projectId]);

  const handleMailboxCreate = async () => {
    if (!projectId) return;
    if (!mailboxForm.host || !mailboxForm.user) return;

    await fetch(`/api/projects/${projectId}/mailboxes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mailboxForm),
    });
    setMailboxForm({
      host: "",
      port: 993,
      user: "",
      password: "",
      tls: true,
      pollingIntervalMinutes: 30,
    });
    await loadMailboxes();
  };


  const handleMailboxDelete = async (mailboxId: string) => {
    const confirmed = window.confirm("Delete this mailbox? This cannot be undone.");
    if (!confirmed) return;

    await fetch(`/api/mailboxes/${mailboxId}`, { method: "DELETE" });
    await loadMailboxes();
  };

  return (
    <>
      <Head>
        <title>Lead Extractor | Project</title>
      </Head>
      <main className="page">
        <section className="card wide">
          <header className="cardHeader">
            <div>
              <h1>{project?.name ?? "Project"}</h1>
              <p>Mailbox settings and parsed email results.</p>
            </div>
            <div className="actions">
              <Link className="secondary" href="/projects">
                Back to projects
              </Link>
            </div>
          </header>

          <div className="section">
            <div className="sectionHeader">
              <div>
                <h2>Mailbox Attributes</h2>
                <p className="muted">Connect an inbox and verify credentials.</p>
              </div>
            </div>
            <div className="form mailboxForm">
              <div className="field">
                <span>Inbox email</span>
                <div className="inputWithButton">
                  <input
                    placeholder="you@company.com"
                    value={mailboxForm.user}
                    onChange={(event) => void handleUserChange(event.target.value)}
                  />
                  <button
                    className="ghost"
                    type="button"
                    onClick={() => void runLookup(mailboxForm.user, "manual")}
                    disabled={!mailboxForm.user}
                    aria-label="Detect IMAP host"
                  >
                    Detect
                  </button>
                </div>
                <span
                  className={`lookupStatus lookupStatus-${lookupStatus}`}
                  aria-live="polite"
                >
                  {lookupStatus === "idle" ? "" : lookupMessage}
                </span>
              </div>
              <div className="field">
                <span>Port</span>
                <input
                  placeholder="993"
                  type="number"
                  value={mailboxForm.port}
                  onChange={(event) =>
                    setMailboxForm({
                      ...mailboxForm,
                      port: Number(event.target.value),
                    })
                  }
                />
              </div>
              <div className="field">
                <span>IMAP host</span>
                <input
                  placeholder="imap.gmail.com"
                  value={mailboxForm.host}
                  onChange={(event) =>
                    setMailboxForm({ ...mailboxForm, host: event.target.value })
                  }
                />
              </div>
              <div className="field">
                <span>Password</span>
                <input
                  placeholder="App password"
                  type="password"
                  value={mailboxForm.password}
                  onChange={(event) =>
                    setMailboxForm({ ...mailboxForm, password: event.target.value })
                  }
                />
              </div>
              <div className="field">
                <span>Poll interval</span>
                <input
                  placeholder="30"
                  type="number"
                  value={mailboxForm.pollingIntervalMinutes}
                  onChange={(event) =>
                    setMailboxForm({
                      ...mailboxForm,
                      pollingIntervalMinutes: Number(event.target.value),
                    })
                  }
                />
              </div>
              <div className="field toggleField">
                <span>Security</span>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={mailboxForm.tls}
                    onChange={(event) =>
                      setMailboxForm({ ...mailboxForm, tls: event.target.checked })
                    }
                  />
                  <span>Use TLS encryption</span>
                </label>
              </div>
              <div className="field formActions">
                <button className="primary" type="button" onClick={handleMailboxCreate}>
                  Save mailbox
                </button>
                <span className="muted">We never store IMAP passwords in logs.</span>
              </div>
            </div>
            <div className="grid">
              {mailboxes.length === 0 ? (
                <p className="muted">No mailboxes configured yet.</p>
              ) : (
                mailboxes.map((mailbox) => (
                  <div key={mailbox.id} className="tile">
                    <h3>
                      <Link href={`/projects/${projectId}/mailboxes/${mailbox.id}`}>
                        {mailbox.user}
                      </Link>
                    </h3>
                    <p>
                      {mailbox.host}:{mailbox.port}
                    </p>
                    <p>Poll every {mailbox.pollingIntervalMinutes} min</p>
                    <div className="tileActions">
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => handleMailboxDelete(mailbox.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="section">
            <h2>Mailparse View</h2>
            <div className="table">
              <div className="tableHeader">
                <span>From</span>
                <span>Subject</span>
                <span>Lead</span>
                <span>Confidence</span>
              </div>
              {emails.length === 0 ? (
                <p className="muted">No emails ingested yet.</p>
              ) : (
                emails.map((email) => {
                  const result = results[email.id];
                  return (
                    <div key={email.id} className="tableRow">
                      <span>{email.sender}</span>
                      <span>{email.subject}</span>
                      <span>{result?.lead ? "Yes" : "No"}</span>
                      <span>
                        {result ? `${Math.round(result.confidence * 100)}%` : "—"}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
