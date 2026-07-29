import type { GitHubReadClient, Repo } from "@/lib/content/github/client";
import { repoLabel } from "@/lib/content/github/client";
import { parseProjectMeta } from "@/lib/content/parse-project";
import type { ContentSource, Project } from "@/lib/content/source";
import type { DocKind, DocRef, ProjectEntry } from "@/lib/content/types";

/**
 * The same projection as the filesystem source, over repos instead of paths
 * (S3). Identical behaviour behind the identical interface is the point: the
 * ops UI, the digest and the MCP tools cannot tell which one they are holding.
 */

const PROJECT_YML = "__project__/project.yml";
const DECISIONS = "__project__/docs/decisions";
const SPECS = "__project__/specs";
const RETRO = "__project__/docs/retro.md";
const BACKLOG = "__project__/tasks/backlog.md";

/** First `# ` heading, else a humanized filename — matches the filesystem source. */
function titleOf(markdown: string, fallbackFile: string): string {
  const heading = markdown.split("\n").find((l) => l.startsWith("# "));
  if (heading) return heading.slice(2).trim();
  return fallbackFile.replace(/\.md$/, "").replace(/[-_]/g, " ");
}

async function readEntry(client: GitHubReadClient, repo: Repo): Promise<ProjectEntry> {
  const root = repoLabel(repo);
  const raw = await client.getFile(repo, PROJECT_YML);
  if (raw === null) return { status: "unconfigured", root, reason: `no ${PROJECT_YML}` };

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

async function docsFor(client: GitHubReadClient, repo: Repo): Promise<DocRef[]> {
  const docs: DocRef[] = [];

  const collect = async (dir: string, kind: DocKind) => {
    for (const entry of await client.listDir(repo, dir)) {
      if (entry.type !== "file" || !entry.name.endsWith(".md")) continue;
      if (entry.name.toLowerCase() === "readme.md") continue;

      const path = `${dir}/${entry.name}`;
      const body = (await client.getFile(repo, path)) ?? "";
      docs.push({
        kind,
        id: entry.name.replace(/\.md$/, ""),
        title: titleOf(body, entry.name),
        path,
      });
    }
  };

  await collect(DECISIONS, "adr");
  await collect(SPECS, "spec");

  const retro = await client.getFile(repo, RETRO);
  if (retro !== null) {
    docs.push({ kind: "retro", id: "retro", title: titleOf(retro, "retro.md"), path: RETRO });
  }

  return docs;
}

export function createGitHubSource(client: GitHubReadClient, repos: Repo[]): ContentSource {
  async function okProject(slug: string): Promise<(Project & { repo: Repo }) | null> {
    for (const repo of repos) {
      const entry = await readEntry(client, repo);
      if (entry.status === "ok" && entry.meta.slug === slug) {
        return { root: entry.root, meta: entry.meta, repo };
      }
    }
    return null;
  }

  return {
    async listProjects() {
      return Promise.all(repos.map((repo) => readEntry(client, repo)));
    },

    async getProject(slug) {
      const found = await okProject(slug);
      return found ? { root: found.root, meta: found.meta } : null;
    },

    async listDocs(slug) {
      const found = await okProject(slug);
      return found ? docsFor(client, found.repo) : [];
    },

    async readDoc(slug, kind, id) {
      const found = await okProject(slug);
      if (!found) return null;

      const docs = await docsFor(client, found.repo);
      const match = docs.find((d) => d.kind === kind && d.id === id);
      return match ? client.getFile(found.repo, match.path) : null;
    },

    async readBacklog(slug) {
      const found = await okProject(slug);
      return found ? client.getFile(found.repo, BACKLOG) : null;
    },
  };
}
