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
  receivedAt: string;
};

type ParseResult = {
  emailId: string;
  lead: boolean;
  confidence: number;
  fields: Record<string, string | number | boolean | null>;
};

export default function MailboxDetailPage() {
  const router = useRouter();
  const { id, mailboxId } = router.query;
  const projectId = Array.isArray(id) ? id[0] : id;
  const mailboxKey = Array.isArray(mailboxId) ? mailboxId[0] : mailboxId;

  const [mailbox, setMailbox] = useState<Mailbox | null>(null);
  const [emails, setEmails] = useState<EmailRecord[]>([]);
  const [results, setResults] = useState<Record<string, ParseResult>>({});
  const [testStatus, setTestStatus] = useState<string>("");
  const [syncStatus, setSyncStatus] = useState<string>("");

  const loadMailbox = async () => {
    if (!mailboxKey) return;
    const response = await fetch(`/api/mailboxes/${mailboxKey}`);
    const data = await response.json();
    setMailbox(data.mailbox);
    setEmails(data.emails ?? []);
    setResults(data.parseResults ?? {});
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
            <h2>Mailbox Emails</h2>
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
                      <span>{result ? `${Math.round(result.confidence * 100)}%` : "—"}</span>
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
