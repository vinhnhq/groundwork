import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { classifyDoc, isDocFile, titleOfMarkdown } from "@/lib/content/classify-doc";
import { parseProjectMeta } from "@/lib/content/parse-project";
import type { ContentSource, Project } from "@/lib/content/source";
import type { DocKind, DocRef, ProjectEntry } from "@/lib/content/types";

const PROJECT_FILE = join("__project__", "project.yml");

/**
 * How deep the walk goes under `__project__/`.
 *
 * A guard, not a preference: the walk follows whatever a project repo happens
 * to contain, and an unbounded recursion over someone else's directory is a
 * denial-of-service on the render. Six levels is far past any real docs tree.
 */
const MAX_DEPTH = 6;

async function tryRead(path: string): Promise<string | null> {
  try {
    return await readFile(path, "utf8");
  } catch {
    return null;
  }
}

/**
 * Every Markdown file under `dir`, as `__project__`-relative forward-slash
 * paths. Unreadable directories yield nothing rather than throwing — one
 * bad-permission folder in someone else's repo must not blank the whole tree.
 */
async function walkMarkdown(dir: string, prefix = "", depth = 0): Promise<string[]> {
  if (depth > MAX_DEPTH) return [];

  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);

  const found: string[] = [];
  for (const entry of entries) {
    // Dotfiles are tooling, not documents.
    if (entry.name.startsWith(".")) continue;
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      found.push(...(await walkMarkdown(join(dir, entry.name), rel, depth + 1)));
    } else if (entry.isFile() && isDocFile(entry.name)) {
      found.push(rel);
    }
  }
  return found.sort();
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

/**
 * Every document in the repo's `__project__/`, classified.
 *
 * Was three hard-coded directories, which meant `docs/architecture.md` and
 * `docs/tech-standards.md` — the two files CLAUDE.md calls the authoritative
 * sources — were never ingested at all. The console could not display the docs
 * it tells agents to read. Walking the tree fixes the omission; `classifyDoc`
 * keeps the recognised kinds (and their URLs) exactly as they were.
 */
async function docsForRoot(root: string): Promise<DocRef[]> {
  const base = join(root, "__project__");
  const rels = await walkMarkdown(base);

  const docs = await Promise.all(
    rels.map(async (relPath): Promise<DocRef> => {
      const path = join(base, relPath);
      const body = (await tryRead(path)) ?? "";
      const { kind, id } = classifyDoc(relPath);
      return { kind, id, title: titleOfMarkdown(body, relPath), path, relPath };
    }),
  );

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
    async readBacklog(slug) {
      const project = await okProject(slug);
      if (!project) return null;
      return tryRead(join(project.root, "__project__", "tasks", "backlog.md"));
    },
  };
}
