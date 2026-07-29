import { classifyDoc, isDocFile, titleOfMarkdown } from "@/lib/content/classify-doc";
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

const PROJECT_DIR = "__project__";
const PROJECT_YML = "__project__/project.yml";
const BACKLOG = "__project__/tasks/backlog.md";

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

/** Mirror of the filesystem walk's guard — see MAX_DEPTH there. */
const MAX_DEPTH = 6;

/**
 * Every Markdown path under `__project__/`, repo-relative.
 *
 * One `listDir` per directory, which is why the depth guard matters more here
 * than on a local disk: each level is a network round trip against someone
 * else's repo layout.
 */
async function walkMarkdown(
  client: GitHubReadClient,
  repo: Repo,
  dir: string,
  depth = 0,
): Promise<string[]> {
  if (depth > MAX_DEPTH) return [];

  const found: string[] = [];
  for (const entry of await client.listDir(repo, dir)) {
    if (entry.name.startsWith(".")) continue;
    const path = `${dir}/${entry.name}`;

    if (entry.type === "dir") {
      found.push(...(await walkMarkdown(client, repo, path, depth + 1)));
    } else if (entry.type === "file" && isDocFile(entry.name)) {
      found.push(path);
    }
  }
  return found.sort();
}

/**
 * Every document in the repo's `__project__/`, classified — the GitHub twin of
 * the filesystem walk. Both route through `classifyDoc`, so a doc's kind, id
 * and URL cannot change with the transport.
 */
async function docsFor(client: GitHubReadClient, repo: Repo): Promise<DocRef[]> {
  const paths = await walkMarkdown(client, repo, PROJECT_DIR);

  return Promise.all(
    paths.map(async (path): Promise<DocRef> => {
      const relPath = path.slice(PROJECT_DIR.length + 1);
      const body = (await client.getFile(repo, path)) ?? "";
      const { kind, id } = classifyDoc(relPath);
      return { kind, id, title: titleOfMarkdown(body, relPath), path, relPath };
    }),
  );
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
