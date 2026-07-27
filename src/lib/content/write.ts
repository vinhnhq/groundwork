import type { Result } from "@/lib/result";

/**
 * How a backlog change reaches the repo.
 *
 * Deliberately a separate seam from `ContentSource` rather than more methods on
 * it (ADR-0002). Reading and writing vary independently — the read side answers
 * "where do the docs live" (filesystem, GitHub), the write side answers "how
 * does a change land" (straight to disk, a git branch, a pull request) — and
 * keeping them apart is what lets the MCP layer be read-only *by type* rather
 * than by discipline.
 */

export type WriteMode = "memory" | "filesystem" | "git-branch" | "github-pr";

export type WriteError =
  | { readonly _tag: "ProjectNotFound"; readonly message: string }
  | { readonly _tag: "NoBacklog"; readonly message: string }
  | { readonly _tag: "TaskNotFound"; readonly message: string }
  | { readonly _tag: "DuplicateTask"; readonly message: string }
  | { readonly _tag: "Unsupported"; readonly message: string }
  | { readonly _tag: "Failed"; readonly message: string };

export type WriteOutcome = {
  mode: WriteMode;
  /** One line for a human: what happened, in the words of the transport. */
  summary: string;
  /** Branch name or commit ref, when the transport has one. */
  ref?: string;
  /** PR/commit URL, when the transport has one. */
  url?: string;
  /**
   * True when the change is proposed but not yet in the canonical branch —
   * a PR awaiting review. The UI must say so rather than imply it landed.
   */
  pending: boolean;
};

export type WriteRequest = {
  slug: string;
  /** Repo root on disk (filesystem/git transports) or `owner/repo` (GitHub). */
  root: string;
  /** Full new contents of `backlog.md`. */
  content: string;
  /** Commit/PR title. */
  message: string;
  /** Who asked for it — attribution survives into the commit. */
  actor: string;
};

export interface BacklogWriter {
  readonly mode: WriteMode;
  /** Human-readable statement of what this writer will do, for the UI. */
  readonly describe: string;
  write(request: WriteRequest): Promise<Result<WriteError, WriteOutcome>>;
}
