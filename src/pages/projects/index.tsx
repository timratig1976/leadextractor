import Head from "next/head";
import Link from "next/link";
import { useEffect, useState } from "react";

type Project = {
  id: string;
  name: string;
  createdAt: string;
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState("");

  const loadProjects = async () => {
    const response = await fetch("/api/projects");
    const data = await response.json();
    setProjects(data.projects);
  };

  useEffect(() => {
    void loadProjects();
  }, []);

  const handleCreate = async () => {
    if (!name.trim()) {
      return;
    }
    await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setName("");
    await loadProjects();
  };

  return (
    <>
      <Head>
        <title>Lead Extractor | Projects</title>
      </Head>
      <main className="page">
        <section className="card wide">
          <header className="cardHeader">
            <div>
              <h1>Projects</h1>
              <p>Create and manage mailboxes for each client.</p>
            </div>
            <Link className="secondary" href="/login">
              Log out
            </Link>
          </header>
          <div className="form inline">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="New project name"
            />
            <button className="primary" type="button" onClick={handleCreate}>
              Create project
            </button>
          </div>
          <div className="grid">
            {projects.length === 0 ? (
              <p className="muted">No projects yet. Create one above.</p>
            ) : (
              projects.map((project) => (
                <Link key={project.id} href={`/projects/${project.id}`}>
                  <div className="tile">
                    <h3>{project.name}</h3>
                    <p>Created {new Date(project.createdAt).toLocaleDateString()}</p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>
      </main>
    </>
  );
}
