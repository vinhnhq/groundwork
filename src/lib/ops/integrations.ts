import "server-only";
import { authStatus } from "@/lib/auth";
import { resolveSourceKind } from "@/lib/content";
import { parseWriteMode } from "@/lib/content/writers";
import { serverEnv } from "@/lib/env-server";
import { getWriter } from "@/lib/ops/write";

/**
 * One honest inventory of every swappable seam: what is running, whether it is
 * real, and exactly which environment variable makes it real.
 *
 * The whole system is built on interchangeable adapters, which is a strength
 * right up until nobody can tell which one is live. This is the answer to
 * "is this thing actually connected?" in one place.
 */

export type IntegrationState = "live" | "mock" | "disabled";

export type Integration = {
  name: string;
  state: IntegrationState;
  /** What is happening right now. */
  detail: string;
  /** What to set to make it real. */
  activate: string;
  env: string[];
};

const present = (value: string | undefined) => Boolean(value?.trim());

export function listIntegrations(): Integration[] {
  const env = serverEnv();
  const source = resolveSourceKind();
  const writer = getWriter();
  const writeMode = parseWriteMode(env.WRITE_BACK);
  const auth = authStatus();

  return [
    {
      name: "Content source",
      state: source === "github" ? "live" : source === "github-mock" ? "mock" : "live",
      detail:
        source === "filesystem"
          ? `Reading local repos from PROJECT_ROOTS (${(env.PROJECT_ROOTS ?? "").split(",").filter(Boolean).length} root(s)). This is a real adapter, not a mock.`
          : source === "github"
            ? "Reading __project__/** from GitHub with a scoped token."
            : "CONTENT_SOURCE=github with no token — serving a built-in demo repo.",
      activate:
        source === "github-mock"
          ? "Set GITHUB_TOKEN (contents: read) and GITHUB_REPOS."
          : "Already a real adapter. Set CONTENT_SOURCE=github to read repos instead of disk.",
      env: ["PROJECT_ROOTS", "CONTENT_SOURCE", "GITHUB_REPOS", "GITHUB_TOKEN"],
    },

    {
      name: "Write-back",
      state: writer.mocked ? "mock" : "live",
      detail: `${writeMode} — ${writer.describe}`,
      activate:
        writeMode === "memory"
          ? "Set WRITE_BACK=git-branch (local commits) or github-pr (opens PRs)."
          : writeMode === "github-pr"
            ? "Set GITHUB_TOKEN with contents+pull_requests: write."
            : "Already writing for real.",
      env: ["WRITE_BACK", "GITHUB_TOKEN"],
    },

    {
      name: "Auth",
      state: "mock",
      detail: auth.note,
      activate:
        "Implement the better-auth/Kysely adapter, then set DATABASE_URL + BETTER_AUTH_SECRET.",
      env: ["DATABASE_URL", "BETTER_AUTH_SECRET", "ADMIN_PASSWORD"],
    },

    {
      name: "Session signing",
      state: auth.secretConfigured ? "live" : "mock",
      detail: auth.secretConfigured
        ? "Sessions signed with BETTER_AUTH_SECRET."
        : "Sessions signed with the built-in dev secret. Unforgeable by a browser, but known to anyone with the source.",
      activate: "Set BETTER_AUTH_SECRET to a long random value.",
      env: ["BETTER_AUTH_SECRET"],
    },

    {
      name: "Triage agent",
      state: present(env.ANTHROPIC_API_KEY) ? "live" : "mock",
      detail: present(env.ANTHROPIC_API_KEY)
        ? "ANTHROPIC_API_KEY is set."
        : "Heuristic analyzer over the project's real docs — no model call.",
      activate: "Set ANTHROPIC_API_KEY and swap getAnalyzer's factory to the Anthropic analyzer.",
      env: ["ANTHROPIC_API_KEY"],
    },

    {
      name: "Remote MCP",
      state: present(env.MCP_TOKEN)
        ? "live"
        : process.env.NODE_ENV === "production"
          ? "disabled"
          : "mock",
      detail: present(env.MCP_TOKEN)
        ? "POST /api/mcp accepts the configured bearer token."
        : process.env.NODE_ENV === "production"
          ? "Refusing all callers: no MCP_TOKEN in production."
          : "POST /api/mcp accepts the well-known dev token (non-production only).",
      activate: "Set MCP_TOKEN to a long random value.",
      env: ["MCP_TOKEN"],
    },

    {
      name: "GitHub push webhook",
      state: present(env.GITHUB_WEBHOOK_SECRET) ? "live" : "disabled",
      detail: present(env.GITHUB_WEBHOOK_SECRET)
        ? "POST /api/webhooks/github verifies signatures and revalidates."
        : "Disabled — an unsigned webhook would let anyone force cache churn.",
      activate:
        "Set GITHUB_WEBHOOK_SECRET and point a GitHub push webhook at /api/webhooks/github.",
      env: ["GITHUB_WEBHOOK_SECRET"],
    },

    {
      name: "Local MCP (stdio)",
      state: "live",
      detail: "Run `bun run mcp`. Reads PROJECT_ROOTS; read-only by construction.",
      activate: "claude mcp add groundwork -- bun run <repo>/src/mcp/server.ts",
      env: ["PROJECT_ROOTS"],
    },
  ];
}
