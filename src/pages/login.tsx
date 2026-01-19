import Head from "next/head";
import Link from "next/link";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <>
      <Head>
        <title>Lead Extractor | Login</title>
      </Head>
      <main className="page">
        <section className="card">
          <header className="cardHeader">
            <h1>Lead Extractor</h1>
            <p>Sign in to manage projects and mailboxes.</p>
          </header>
          <form className="form" onSubmit={(event) => event.preventDefault()}>
            <label className="field">
              <span>Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@company.com"
              />
            </label>
            <label className="field">
              <span>Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
              />
            </label>
            <button className="primary" type="submit">
              Sign in (MVP)
            </button>
          </form>
          <div className="helper">
            <span>No auth yet. Continue to the MVP dashboard.</span>
            <Link href="/projects">Go to projects</Link>
          </div>
        </section>
      </main>
    </>
  );
}
