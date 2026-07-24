import { readdir, readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { parseProjectMeta } from "@/lib/content/parse-project";
import type { ContentSource, Project } from "@/lib/content/source";
import type { DocKind, DocRef, ProjectEntry } from "@/lib/content/types";

const PROJECT_FILE = join("__project__", "project.yml");

async function tryRead(path: string): Promise<string | null> {
  try {
    return await readFile(path, "utf8");
  } catch {
    return null;
  }
}

async function tryList(dir: string): Promise<string[]> {
  try {
    return (await readdir(dir)).filter((f) => f.endsWith(".md")).sort();
  } catch {
    return [];
  }
}

/** First `# ` heading, else a humanized filename. */
function titleOf(markdown: string, fallbackFile: string): string {
  const heading = markdown.split("\n").find((l) => l.startsWith("# "));
  if (heading) return heading.slice(2).trim();
  return basename(fallbackFile, ".md").replace(/[-_]/g, " ");
}

async function readEntry(root: string): Promise<ProjectEntry> {
  const raw = await tryRead(join(root, PROJECT_FILE));
  if (raw === null) {
    return { status: "unconfigured", root, reason: "no __project__/project.yml" };
  }
  const parsed = parseProjectMeta(raw);
  if (parsed._tag === "err") {
    const reason =
      parsed.error._tag === "InvalidYaml"
        ? `invalid YAML: ${parsed.error.message}`
        : `invalid frontmatter: ${parsed.error.issues.join("; ")}`;
    return { status: "unconfigured", root, reason };
  }
  return { status: "ok", root, meta: parsed.value };
}

async function docsForRoot(root: string): Promise<DocRef[]> {
  const docs: DocRef[] = [];

  const decisionsDir = join(root, "__project__", "docs", "decisions");
  for (const file of await tryList(decisionsDir)) {
    if (file.toLowerCase() === "readme.md") continue;
    const path = join(decisionsDir, file);
    const body = (await tryRead(path)) ?? "";
    const id = file.replace(/\.md$/, "");
    docs.push({ kind: "adr", id, title: titleOf(body, file), path });
  }

  const specsDir = join(root, "__project__", "specs");
  for (const file of await tryList(specsDir)) {
    const path = join(specsDir, file);
    const body = (await tryRead(path)) ?? "";
    docs.push({ kind: "spec", id: file.replace(/\.md$/, ""), title: titleOf(body, file), path });
  }

  const retroPath = join(root, "__project__", "docs", "retro.md");
  const retro = await tryRead(retroPath);
  if (retro !== null) {
    docs.push({ kind: "retro", id: "retro", title: titleOf(retro, "retro.md"), path: retroPath });
  }

  return docs;
}

/** Filesystem ContentSource over sibling repo roots. */
export function createFilesystemSource(roots: string[]): ContentSource {
  const clean = roots.map((r) => r.trim()).filter(Boolean);

  async function okProject(slug: string): Promise<Project | null> {
    for (const root of clean) {
      const entry = await readEntry(root);
      if (entry.status === "ok" && entry.meta.slug === slug) {
        return { root: entry.root, meta: entry.meta };
      }
    }
    return null;
  }

  return {
    async listProjects() {
      return Promise.all(clean.map(readEntry));
    },
    getProject: okProject,
    async listDocs(slug) {
      const project = await okProject(slug);
      return project ? docsForRoot(project.root) : [];
    },
    async readDoc(slug, kind: DocKind, id) {
      const project = await okProject(slug);
      if (!project) return null;
      const docs = await docsForRoot(project.root);
      const match = docs.find((d) => d.kind === kind && d.id === id);
      return match ? tryRead(match.path) : null;
    },
  };
}
