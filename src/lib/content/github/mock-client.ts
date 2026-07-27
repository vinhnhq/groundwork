import type { DirEntry, GitHubReadClient, Repo } from "@/lib/content/github/client";
import { repoLabel } from "@/lib/content/github/client";

/**
 * An in-memory stand-in for the GitHub API, keyed `owner/name:path`.
 *
 * Exists so the GitHub-backed source can be exercised — in tests and in the
 * running app — without a token. It is deliberately the same shape as the REST
 * client, so swapping in the real one changes a factory call and nothing else.
 */
export function createMockGitHubClient(files: Record<string, string>): GitHubReadClient {
  const key = (repo: Repo, path: string) => `${repoLabel(repo)}:${path}`;

  return {
    kind: "mock",

    async getFile(repo, path) {
      return files[key(repo, path)] ?? null;
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
