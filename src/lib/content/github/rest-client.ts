import type { DirEntry, GitHubReadClient, Repo } from "@/lib/content/github/client";

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

export function createRestGitHubClient(token: string): GitHubReadClient {
  const request = async (path: string): Promise<Response> =>
    fetch(`${API}${path}`, {
      headers: {
        authorization: `Bearer ${token}`,
        accept: "application/vnd.github+json",
        "x-github-api-version": "2022-11-28",
      },
      // Grounding must reflect the current docs (spec v2 §5).
      cache: "no-store",
    });

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

      return (body as ContentsEntry[]).map(
        (entry): DirEntry => ({ name: entry.name, type: entry.type === "dir" ? "dir" : "file" }),
      );
    },
  };
}
