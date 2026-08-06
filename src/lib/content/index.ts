import { createFilesystemSource } from "@/lib/content/filesystem-source";
import { createGitHubSource } from "@/lib/content/github-source";
import { parseRepo } from "@/lib/content/github/client";
import { createMockGitHubClient, DEMO_GITHUB_FILES } from "@/lib/content/github/mock-client";
import { createRestGitHubClient } from "@/lib/content/github/rest-client";
import type { ContentSource } from "@/lib/content/source";
import { serverEnv } from "@/lib/env-server";

export type { ContentSource, Project } from "@/lib/content/source";
export type { DocKind, DocRef, ProjectEntry, ProjectMeta } from "@/lib/content/types";

/** Cache tag for one project's projection, keyed by repo full name or slug. */
export const projectTag = (key: string): string => `project:${key}`;

export type SourceKind = "filesystem" | "github-mock" | "github";

/** Which source the current configuration selects — shown on /ops/integrations. */
export function resolveSourceKind(): SourceKind {
  const env = serverEnv();
  if (env.CONTENT_SOURCE?.trim() !== "github") return "filesystem";
  return env.GITHUB_TOKEN?.trim() ? "github" : "github-mock";
}

/**
 * ADR-0001 (+ its S3 amendment): filesystem-local by default; GitHub when
 * `CONTENT_SOURCE=github`. Without a token the GitHub path runs on the mock
 * client, so the deployed shape is explorable before any secret exists — and
 * /ops/integrations names which of the two is live, because a mock you cannot
 * distinguish from the real thing is how a demo silently becomes production.
 */
export function getContentSource(): ContentSource {
  const env = serverEnv();

  if (resolveSourceKind() === "filesystem") {
    return createFilesystemSource((env.PROJECT_ROOTS ?? "").split(","));
  }

  const repos = (env.GITHUB_REPOS ?? "")
    .split(",")
    .map(parseRepo)
    .filter((r): r is NonNullable<ReturnType<typeof parseRepo>> => r !== null);

  const token = env.GITHUB_TOKEN?.trim();
  if (token) return createGitHubSource(createRestGitHubClient(token), repos);

  // Mock: fall back to the demo repo when none is configured, so the page shows
  // something explorable rather than an empty list that reads as a bug.
  const demo = parseRepo("acme/checkout");
  return createGitHubSource(
    createMockGitHubClient(DEMO_GITHUB_FILES),
    repos.length > 0 ? repos : demo ? [demo] : [],
  );
}
