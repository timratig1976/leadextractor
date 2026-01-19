import Head from "next/head";
import Link from "next/link";

export default function Home() {
  return (
    <>
      <Head>
        <title>Lead Extractor | MVP</title>
        <meta name="description" content="Lead extraction middleware MVP" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="page hero">
        <div className="heroShell">
          <header className="heroHeader">
            <div className="eyebrow">Lead Extractor</div>
            <h1>
              Turn every inbox into a <span>structured lead pipeline</span>.
            </h1>
            <p>
              Track mailboxes, parse inbound leads, and route clean, enriched data
              into your CRM in minutes.
            </p>
            <div className="heroActions">
              <Link className="primary" href="/projects">
                Open dashboard
              </Link>
              <Link className="secondary" href="/login">
                Sign in
              </Link>
            </div>
            <div className="heroStats">
              <div>
                <strong>4 min</strong>
                <span>to connect a mailbox</span>
              </div>
              <div>
                <strong>98%</strong>
                <span>field coverage</span>
              </div>
              <div>
                <strong>24/7</strong>
                <span>lead monitoring</span>
              </div>
            </div>
          </header>
          <section className="heroPanel">
            <div className="panelHeader">
              <div>
                <h2>Command Center</h2>
                <p>Live mailboxes, routing rules, and parsed lead previews.</p>
              </div>
              <span className="statusPill">Live</span>
            </div>
            <div className="panelGrid">
              <article>
                <h3>Mailboxes</h3>
                <p>3 active • 1 needs auth</p>
                <button>Review mailboxes</button>
              </article>
              <article>
                <h3>Lead Health</h3>
                <p>214 leads this week • 12 flagged</p>
                <button>View queue</button>
              </article>
              <article>
                <h3>Automation</h3>
                <p>Routing rules synced 5 mins ago</p>
                <button>Manage rules</button>
              </article>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
