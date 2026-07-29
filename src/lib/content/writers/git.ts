import type { Clock } from "@/lib/clock";
import type { BacklogWriter, WriteError, WriteOutcome } from "@/lib/content/write";
import { backlogPath } from "@/lib/content/writers/filesystem";
import { err, ok, type Result } from "@/lib/result";

/**
 * Local-git write-back: commit the change on a branch, never on the checked-out
 * one (ADR-0002 — AI proposes, humans dispose).
 *
 * Every effect is injected. Shelling out to git is the least testable thing in
 * this codebase, and the failure mode — committing to the wrong branch of
 * someone's working tree — is one you want caught by a test rather than by a
 * colleague.
 */

export type GitResult = { code: number; stdout: string; stderr: string };
export type GitRun = (args: string[], cwd: string) => Promise<GitResult>;

export type GitDeps = {
  run: GitRun;
  writeText: (path: string, content: string) => Promise<void>;
  clock: Clock;
};

/** `groundwork/<slug>-20260728-120000` — sortable, obviously ours. */
export function branchName(slug: string, at: Date): string {
  // YYYYMMDD (8) + HHMMSS (6) = 14; anything more picks up the millis separator.
  const stamp = at.toISOString().replace(/[-:T]/g, "").slice(0, 14);
  return `groundwork/${slug}-${stamp}`;
}

const failed = (message: string): Result<WriteError, never> =>
  err({ _tag: "Failed" as const, message });

export function createGitWriter(deps: GitDeps): BacklogWriter {
  const { run, writeText, clock } = deps;

  const git = async (args: string[], cwd: string): Promise<Result<WriteError, string>> => {
    const result = await run(args, cwd);
    return result.code === 0
      ? ok(result.stdout.trim())
      : failed(`git ${args.join(" ")} failed: ${result.stderr.trim() || result.stdout.trim()}`);
  };

  return {
    mode: "git-branch",
    describe: "Commits the change on a new groundwork/* branch in the local repo. Never on main.",

    async write({
      slug,
      root,
      content,
      message,
      actor,
    }): Promise<Result<WriteError, WriteOutcome>> {
      const inRepo = await run(["rev-parse", "--is-inside-work-tree"], root);
      if (inRepo.code !== 0) {
        return err({ _tag: "Unsupported", message: `${root} is not a git repository.` });
      }

      const branch = branchName(slug, clock.now());

      // Branch first, so a failure part-way through leaves the user's checked-out
      // branch untouched rather than half-edited.
      const created = await git(["checkout", "-b", branch], root);
      if (created._tag === "err") return created;

      try {
        await writeText(backlogPath(root), content);
      } catch (error) {
        return failed(`Could not write backlog.md: ${String(error)}`);
      }

      const staged = await git(["add", "__project__/tasks/backlog.md"], root);
      if (staged._tag === "err") return staged;

      // Attribution as a trailer, not --author: the actor is a UI identity, not
      // necessarily a valid git ident, and a malformed one aborts the commit.
      const committed = await git(
        ["commit", "-m", message, "-m", `Requested-by: ${actor}\nVia: Groundwork`],
        root,
      );
      if (committed._tag === "err") return committed;

      const sha = await git(["rev-parse", "--short", "HEAD"], root);

      return ok({
        mode: "git-branch",
        summary: `Committed to ${branch}. Merge or open a PR to land it.`,
        ref: sha._tag === "ok" ? `${branch}@${sha.value}` : branch,
        pending: true,
      });
    },
  };
}
