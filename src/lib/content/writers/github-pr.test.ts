import { describe, expect, it } from "vitest";
import { makeFixedClock } from "@/lib/clock";
import type { GitHubWriteClient } from "@/lib/content/github/client";
import { createMockGitHubClient, DEMO_GITHUB_FILES } from "@/lib/content/github/mock-client";
import { createGitHubPrWriter } from "@/lib/content/writers/github-pr";
import { isErr, isOk } from "@/lib/result";

const clock = makeFixedClock(new Date("2026-07-28T12:00:00Z"));

const request = {
  slug: "checkout",
  root: "acme/checkout",
  content: "# Backlog\n\n- · **C9.9** New\n",
  message: "tasks(checkout): add C9.9 — New",
  actor: "qa@acme.com",
};

describe("createGitHubPrWriter", () => {
  it("branches, commits and opens a PR, in that order", async () => {
    const client = createMockGitHubClient(DEMO_GITHUB_FILES);
    const result = await createGitHubPrWriter(client, clock).write(request);

    expect(isOk(result)).toBe(true);
    expect(client.branches).toHaveLength(1);
    expect(client.branches[0].branch).toBe("groundwork/checkout-20260728120000");
    expect(client.pullRequests).toHaveLength(1);
    expect(client.pullRequests[0].head).toBe("groundwork/checkout-20260728120000");
  });

  it("commits the new backlog to the branch, readable afterwards", async () => {
    const client = createMockGitHubClient(DEMO_GITHUB_FILES);
    await createGitHubPrWriter(client, clock).write(request);

    const written = await client.getFile(
      { owner: "acme", name: "checkout", branch: "main" },
      "__project__/tasks/backlog.md",
    );
    expect(written).toContain("C9.9");
  });

  it("attributes the requester in the PR body", async () => {
    const client = createMockGitHubClient(DEMO_GITHUB_FILES);
    await createGitHubPrWriter(client, clock).write(request);

    expect(client.pullRequests[0].body).toContain("qa@acme.com");
  });

  it("reports the change as pending with a link — a PR is not a merge", async () => {
    const client = createMockGitHubClient(DEMO_GITHUB_FILES);
    const result = await createGitHubPrWriter(client, clock).write(request);

    if (!isOk(result)) throw new Error("expected ok");
    expect(result.value.pending).toBe(true);
    expect(result.value.url).toContain("/pull/1");
    expect(result.value.summary).toMatch(/lands when merged/i);
  });

  it("refuses a root that is not owner/repo", async () => {
    const client = createMockGitHubClient(DEMO_GITHUB_FILES);
    const result = await createGitHubPrWriter(client, clock).write({
      ...request,
      root: "/Users/someone/repo",
    });

    expect(isErr(result)).toBe(true);
    if (isErr(result)) expect(result.error._tag).toBe("Unsupported");
  });

  it("does not claim success when the PR call fails after the commit", async () => {
    const client = createMockGitHubClient(DEMO_GITHUB_FILES);
    const failing: GitHubWriteClient = {
      ...client,
      async openPullRequest() {
        return null;
      },
    };

    const result = await createGitHubPrWriter(failing, clock).write(request);

    expect(isErr(result)).toBe(true);
    if (isErr(result)) expect(result.error.message).toContain("could not open the pull request");
  });

  it("stops at the first failure rather than pressing on", async () => {
    const client = createMockGitHubClient(DEMO_GITHUB_FILES);
    const failing: GitHubWriteClient = {
      ...client,
      async createBranch() {
        return false;
      },
    };

    const result = await createGitHubPrWriter(failing, clock).write(request);

    expect(isErr(result)).toBe(true);
    expect(client.pullRequests).toHaveLength(0);
  });
});
