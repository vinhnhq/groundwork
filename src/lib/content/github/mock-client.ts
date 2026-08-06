import type { DirEntry, GitHubClient, PullRequest, Repo } from "@/lib/content/github/client";
import { repoLabel } from "@/lib/content/github/client";

export type MockGitHub = GitHubClient & {
  /** Branches the mock was asked to create, in order. */
  branches: { repo: string; branch: string; fromSha: string }[];
  /** PRs the mock was asked to open, in order. */
  pullRequests: (PullRequest & { repo: string; head: string; title: string; body: string })[];
};

/**
 * An in-memory stand-in for the GitHub API, keyed `owner/name:path`.
 *
 * Exists so the GitHub-backed source and PR write-back can be exercised — in
 * tests and in the running app — without a token. Deliberately the same shape
 * as the REST client, so swapping in the real one changes a factory call and
 * nothing else. Writes mutate the in-memory file map, so a read after a write
 * sees the change exactly as it would against GitHub.
 */
const key = (repo: Repo, path: string) => `${repoLabel(repo)}:${path}`;

export function createMockGitHubClient(seed: Record<string, string>): MockGitHub {
  const files = { ...seed };
  const branches: MockGitHub["branches"] = [];
  const pullRequests: MockGitHub["pullRequests"] = [];

  return {
    kind: "mock",
    branches,
    pullRequests,

    async getFile(repo, path) {
      return files[key(repo, path)] ?? null;
    },

    async headSha(repo) {
      return `mocksha-${repoLabel(repo).replace("/", "-")}`;
    },

    async createBranch(repo, branch, fromSha) {
      branches.push({ repo: repoLabel(repo), branch, fromSha });
      return true;
    },

    async putFile(repo, _branch, path, content) {
      files[key(repo, path)] = content;
      return true;
    },

    async openPullRequest(repo, head, title, body) {
      const number = pullRequests.length + 1;
      const pr = {
        number,
        url: `https://github.com/${repoLabel(repo)}/pull/${number}`,
        repo: repoLabel(repo),
        head,
        title,
        body,
      };
      pullRequests.push(pr);
      return { url: pr.url, number: pr.number };
    },

    async listDir(repo, path) {
      const prefix = `${key(repo, path).replace(/\/$/, "")}/`;
      const seen = new Map<string, DirEntry>();

      for (const full of Object.keys(files)) {
        if (!full.startsWith(prefix)) continue;
        const rest = full.slice(prefix.length);
        const [head, ...tail] = rest.split("/");
        if (head) seen.set(head, { name: head, type: tail.length > 0 ? "dir" : "file" });
      }

      return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
    },
  };
}

/** A believable private repo, so the GitHub source has something to render. */
export const DEMO_GITHUB_FILES: Record<string, string> = {
  "acme/checkout:__project__/project.yml": [
    "slug: checkout",
    "name: Acme Checkout",
    "tagline: Payments flow for the Acme storefront",
    "status: active",
    "visibility: private",
    "stack: [next, stripe, postgres]",
  ].join("\n"),

  "acme/checkout:__project__/docs/decisions/0001-stripe-over-adyen.md": [
    "# ADR-0001 — Stripe over Adyen",
    "",
    "Status: Accepted",
    "",
    "## Decision",
    "",
    "Use Stripe for card processing. Adyen's pricing wins above ~£2M/yr volume, which we are",
    "nowhere near, and Stripe's test tooling is materially better for a team of three.",
  ].join("\n"),

  "acme/checkout:__project__/specs/v1-checkout.md": [
    "# v1 — Checkout",
    "",
    "## Out of scope",
    "",
    "- **Saved cards / vaulting.** Needs a PCI review we have not scheduled.",
    "- **Multi-currency.** GBP only until there is a non-UK customer.",
  ].join("\n"),

  "acme/checkout:__project__/tasks/backlog.md": [
    "# Backlog",
    "",
    "### C1 · Checkout  → **[P]**",
    "",
    "- · **C1.1** Handle a declined card without losing the basket",
    "    - **Intent:** a decline currently drops the basket, so the customer starts over",
    "    - **Touches:** src/checkout/**   **Must NOT:** the Stripe webhook handler",
    "    - **Oracle:** e2e — decline the test card, basket contents survive",
    "    - **Evidence:** ADR-0001 · src/checkout/session.ts:88",
    "    - **Escalate if:** the basket lives in Stripe's session rather than ours",
    "",
    "- · **C1.2** Retry idempotency for webhook replays",
    "    - **Intent:** Stripe replays webhooks and we double-fulfil",
  ].join("\n"),
};
