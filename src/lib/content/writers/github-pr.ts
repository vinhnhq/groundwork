import type { Clock } from "@/lib/clock";
import type { GitHubWriteClient, Repo } from "@/lib/content/github/client";
import { parseRepo, repoLabel } from "@/lib/content/github/client";
import type { BacklogWriter, WriteError, WriteOutcome } from "@/lib/content/write";
import { branchName } from "@/lib/content/writers/git";
import { err, ok, type Result } from "@/lib/result";

const BACKLOG_PATH = "__project__/tasks/backlog.md";

/**
 * The real PM/QA sync path (S4): the UI change becomes a pull request.
 *
 * This is the default transport for a shared instance, per ADR-0002 — the
 * people making these changes are not the ones reviewing the Markdown, and a
 * PR is the review surface the team already has. It is also reversible by
 * construction: a bad PR is closed, a bad commit to main needs a revert.
 */
export function createGitHubPrWriter(
  client: GitHubWriteClient,
  clock: Clock,
  resolveRepo: (root: string) => Repo | null = parseRepo,
): BacklogWriter {
  return {
    mode: "github-pr",
    describe: "Opens a pull request against the project's repo. Nothing lands until it is merged.",

    async write({
      slug,
      root,
      content,
      message,
      actor,
    }): Promise<Result<WriteError, WriteOutcome>> {
      const repo = resolveRepo(root);
      if (!repo) {
        return err({
          _tag: "Unsupported",
          message: `"${root}" is not an owner/repo — the GitHub writer needs a repo-backed source.`,
        });
      }

      const sha = await client.headSha(repo);
      if (!sha) {
        return err({ _tag: "Failed", message: `Could not read ${repoLabel(repo)}'s head commit.` });
      }

      const branch = branchName(slug, clock.now());
      if (!(await client.createBranch(repo, branch, sha))) {
        return err({ _tag: "Failed", message: `Could not create branch ${branch}.` });
      }

      if (!(await client.putFile(repo, branch, BACKLOG_PATH, content, message))) {
        return err({ _tag: "Failed", message: `Could not commit ${BACKLOG_PATH} on ${branch}.` });
      }

      const body = [
        message,
        "",
        `Requested by **${actor}** through Groundwork.`,
        "",
        "The repo Markdown is the single source of truth — this PR is the change,",
        "not a mirror of one already applied elsewhere.",
      ].join("\n");

      const pr = await client.openPullRequest(repo, branch, message, body);
      if (!pr) {
        return err({
          _tag: "Failed",
          message: `Committed to ${branch} but could not open the pull request.`,
        });
      }

      return ok({
        mode: "github-pr",
        summary: `Opened PR #${pr.number} on ${repoLabel(repo)}. It lands when merged.`,
        ref: branch,
        url: pr.url,
        pending: true,
      });
    },
  };
}
