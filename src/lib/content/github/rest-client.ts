import type { DirEntry, GitHubClient, Repo } from "@/lib/content/github/client";

/**
 * The real GitHub contents API, used when a scoped token is configured.
 *
 * Untested against live GitHub in this repo — there is no token to test with —
 * so it is deliberately thin: no pagination beyond a directory listing, no
 * caching, no retries. Everything clever lives in the source above it, which is
 * covered against the mock client.
 */

const API = "https://api.github.com";

type ContentsEntry = { name: string; type: string; content?: string; encoding?: string };

export function createRestGitHubClient(token: string): GitHubClient {
  const request = async (path: string, init?: RequestInit): Promise<Response> =>
    fetch(`${API}${path}`, {
      ...init,
      method: init?.method ?? "GET",
      headers: {
        authorization: `Bearer ${token}`,
        accept: "application/vnd.github+json",
        "x-github-api-version": "2022-11-28",
        ...(init?.body ? { "content-type": "application/json" } : {}),
      },
      // Grounding must reflect the current docs (spec v2 §5).
      cache: "no-store",
    });

  const repoPath = (repo: Repo) => `/repos/${repo.owner}/${repo.name}`;

  const contentsUrl = (repo: Repo, path: string) =>
    `/repos/${repo.owner}/${repo.name}/contents/${encodeURI(path)}?ref=${encodeURIComponent(repo.branch)}`;

  return {
    kind: "rest",

    async getFile(repo, path) {
      const response = await request(contentsUrl(repo, path));
      if (!response.ok) return null;

      const body = (await response.json()) as ContentsEntry;
      if (typeof body.content !== "string") return null;

      return body.encoding === "base64"
        ? Buffer.from(body.content, "base64").toString("utf8")
        : body.content;
    },

    async listDir(repo, path) {
      const response = await request(contentsUrl(repo, path));
      if (!response.ok) return [];

      const body = await response.json();
      if (!Array.isArray(body)) return [];

      return (body as ContentsEntry[]).map((entry): DirEntry => ({
        name: entry.name,
        type: entry.type === "dir" ? "dir" : "file",
      }));
    },

    async headSha(repo) {
      const response = await request(`${repoPath(repo)}/git/ref/heads/${repo.branch}`);
      if (!response.ok) return null;

      const body = (await response.json()) as { object?: { sha?: string } };
      return body.object?.sha ?? null;
    },

    async createBranch(repo, branch, fromSha) {
      const response = await request(`${repoPath(repo)}/git/refs`, {
        method: "POST",
        body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: fromSha }),
      });
      return response.ok;
    },

    async putFile(repo, branch, path, content, message) {
      // Updating an existing file requires its current blob sha; creating one
      // requires the sha to be absent. Look first, so the same call does both.
      const existing = await request(
        `${repoPath(repo)}/contents/${encodeURI(path)}?ref=${encodeURIComponent(branch)}`,
      );
      const sha = existing.ok ? ((await existing.json()) as { sha?: string }).sha : undefined;

      const response = await request(`${repoPath(repo)}/contents/${encodeURI(path)}`, {
        method: "PUT",
        body: JSON.stringify({
          message,
          content: Buffer.from(content, "utf8").toString("base64"),
          branch,
          ...(sha ? { sha } : {}),
        }),
      });
      return response.ok;
    },

    async openPullRequest(repo, head, title, body) {
      const response = await request(`${repoPath(repo)}/pulls`, {
        method: "POST",
        body: JSON.stringify({ title, head, base: repo.branch, body }),
      });
      if (!response.ok) return null;

      const created = (await response.json()) as { html_url?: string; number?: number };
      return created.html_url && created.number
        ? { url: created.html_url, number: created.number }
        : null;
    },
  };
}
