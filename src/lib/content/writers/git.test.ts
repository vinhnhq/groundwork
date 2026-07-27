import { describe, expect, it } from "vitest";
import { makeFixedClock } from "@/lib/clock";
import { branchName, createGitWriter, type GitResult } from "@/lib/content/writers/git";
import { isErr, isOk } from "@/lib/result";

const AT = new Date("2026-07-28T12:00:00Z");
const clock = makeFixedClock(AT);

type Recorded = { args: string[]; cwd: string };

function harness(overrides: Record<string, GitResult> = {}) {
  const commands: Recorded[] = [];
  const written: { path: string; content: string }[] = [];

  const writer = createGitWriter({
    clock,
    async run(args, cwd) {
      commands.push({ args, cwd });
      return overrides[args[0]] ?? { code: 0, stdout: "abc1234", stderr: "" };
    },
    async writeText(path, content) {
      written.push({ path, content });
    },
  });

  return { writer, commands, written };
}

const request = {
  slug: "demo",
  root: "/repo",
  content: "# Backlog\n",
  message: "tasks(demo): add N1",
  actor: "pm@example.com",
};

describe("branchName", () => {
  it("is sortable and obviously ours", () => {
    expect(branchName("demo", AT)).toBe("groundwork/demo-20260728120000");
  });
});

describe("createGitWriter", () => {
  it("branches before writing, so a failure never touches the checked-out branch", async () => {
    const { writer, commands, written } = harness();
    const result = await writer.write(request);

    expect(isOk(result)).toBe(true);

    const verbs = commands.map((c) => c.args[0]);
    expect(verbs).toEqual(["rev-parse", "checkout", "add", "commit", "rev-parse"]);

    // The checkout happens before the file is touched.
    const checkoutIndex = commands.findIndex((c) => c.args[0] === "checkout");
    expect(checkoutIndex).toBeGreaterThanOrEqual(0);
    expect(written).toHaveLength(1);
    expect(written[0].path).toContain("__project__/tasks/backlog.md");
  });

  it("commits to a groundwork/* branch, never the current one", async () => {
    const { writer, commands } = harness();
    await writer.write(request);

    const checkout = commands.find((c) => c.args[0] === "checkout");
    expect(checkout?.args).toEqual(["checkout", "-b", "groundwork/demo-20260728120000"]);
  });

  it("attributes the actor with a trailer, not --author", async () => {
    const { writer, commands } = harness();
    await writer.write(request);

    const commit = commands.find((c) => c.args[0] === "commit");
    expect(commit?.args.join(" ")).toContain("Requested-by: pm@example.com");
    // A UI identity is not necessarily a valid git ident; --author would abort.
    expect(commit?.args).not.toContain("--author");
  });

  it("reports the change as pending — a branch is not merged", async () => {
    const { writer } = harness();
    const result = await writer.write(request);

    if (!isOk(result)) throw new Error("expected ok");
    expect(result.value.pending).toBe(true);
    expect(result.value.ref).toContain("groundwork/demo");
  });

  it("refuses a directory that is not a git repo", async () => {
    const { writer, written } = harness({
      "rev-parse": { code: 128, stdout: "", stderr: "not a git repo" },
    });
    const result = await writer.write(request);

    expect(isErr(result)).toBe(true);
    if (isErr(result)) expect(result.error._tag).toBe("Unsupported");
    expect(written).toHaveLength(0);
  });

  it("surfaces a failing git command instead of claiming success", async () => {
    const { writer } = harness({ checkout: { code: 1, stdout: "", stderr: "branch exists" } });
    const result = await writer.write(request);

    expect(isErr(result)).toBe(true);
    if (isErr(result)) expect(result.error.message).toContain("branch exists");
  });
});
