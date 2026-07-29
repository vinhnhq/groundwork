/**
 * The narrow slice of GitHub this app needs, behind one interface so the
 * deployed instance and the laptop run the same source code (S3/S4).
 *
 * Named `kind` rather than inferred from whether a token exists, because
 * /ops/integrations shows the user which one is live — a mock that cannot be
 * distinguished from the real thing is how a demo silently becomes production.
 */

export type Repo = { owner: string; name: string; branch: string };

export type DirEntry = { name: string; type: "file" | "dir" };

export interface GitHubReadClient {
  readonly kind: "mock" | "rest";
  /** File contents, or null when it does not exist. */
  getFile(repo: Repo, path: string): Promise<string | null>;
  /** Directory listing, empty when the path is absent. */
  listDir(repo: Repo, path: string): Promise<DirEntry[]>;
}

export type PullRequest = { url: string; number: number };

/**
 * The write half (S4). Separate from the read half so a read-only deployment
 * can hold a client that structurally cannot open a PR.
 */
export interface GitHubWriteClient {
  /** Head commit sha of the repo's default branch. */
  headSha(repo: Repo): Promise<string | null>;
  createBranch(repo: Repo, branch: string, fromSha: string): Promise<boolean>;
  /** Create or update a file on a branch. */
  putFile(
    repo: Repo,
    branch: string,
    path: string,
    content: string,
    message: string,
  ): Promise<boolean>;
  openPullRequest(
    repo: Repo,
    head: string,
    title: string,
    body: string,
  ): Promise<PullRequest | null>;
}

export type GitHubClient = GitHubReadClient & GitHubWriteClient;

/** `owner/name` or `owner/name#branch` → Repo. */
export function parseRepo(spec: string): Repo | null {
  const [path, branch] = spec.trim().split("#");
  const [owner, name] = path.split("/");
  if (!owner || !name) return null;
  return { owner, name, branch: branch?.trim() || "main" };
}

export const repoLabel = (repo: Repo): string => `${repo.owner}/${repo.name}`;
