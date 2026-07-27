import { describe, expect, it } from "vitest";
import { isErr, isOk } from "@/lib/result";
import { parseBacklog } from "@/lib/tasks/parse-backlog";
import { appendTask, renderTask, setTaskStatus } from "@/lib/tasks/serialize";
import type { Task, TaskStatus } from "@/lib/tasks/types";

const task = (over: Partial<Task> = {}): Task => ({
  id: "N1",
  project: "demo",
  title: "A new task",
  status: "todo",
  autonomy: "plan-gated",
  intent: "capture it without git",
  touches: ["src/lib/x", "src/app/y"],
  mustNot: ["src/db"],
  oracle: "the round-trip test passes",
  evidence: [
    { kind: "adr", ref: "ADR-0002" },
    { kind: "file", ref: "src/x.ts:1" },
  ],
  escalateIf: "the grammar drifts",
  ...over,
});

const backlog = [
  "# Backlog",
  "",
  "### S1 · Sample  → **[D]**",
  "",
  "- · **S1.1** An existing task",
  "    - **Intent:** already here",
  "",
].join("\n");

describe("renderTask ⇄ parseBacklog round trip", () => {
  it("survives a full DoR task unchanged", () => {
    const original = task();
    const [parsed] = parseBacklog(renderTask(original), "demo");

    expect(parsed).toEqual(original);
  });

  it("round-trips every status marker", () => {
    const statuses: TaskStatus[] = ["todo", "in-progress", "done", "blocked", "stretch"];
    for (const status of statuses) {
      const [parsed] = parseBacklog(renderTask(task({ status })), "demo");
      expect(parsed.status).toBe(status);
    }
  });

  it("round-trips every autonomy tier", () => {
    for (const autonomy of ["supervised", "plan-gated", "dark", "trivial"] as const) {
      const [parsed] = parseBacklog(renderTask(task({ autonomy })), "demo");
      expect(parsed.autonomy).toBe(autonomy);
    }
  });

  it("survives a bare task with no DoR fields", () => {
    const bare = task({
      intent: undefined,
      touches: [],
      mustNot: [],
      oracle: undefined,
      evidence: [],
      escalateIf: undefined,
      autonomy: undefined,
    });
    const [parsed] = parseBacklog(renderTask(bare), "demo");

    expect(parsed).toEqual(bare);
  });
});

describe("appendTask", () => {
  it("adds the block at the end, leaving existing content intact", () => {
    const result = appendTask(backlog, task());
    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;

    expect(result.value).toContain("- · **S1.1** An existing task");
    expect(result.value).toContain("**N1**");

    // Both tasks parse afterwards — the file is still valid.
    const ids = parseBacklog(result.value, "demo").map((t) => t.id);
    expect(ids).toEqual(["S1.1", "N1"]);
  });

  it("refuses a duplicate id rather than creating two of the same task", () => {
    const result = appendTask(backlog, task({ id: "S1.1" }));

    expect(isErr(result)).toBe(true);
    if (isErr(result)) expect(result.error._tag).toBe("DuplicateTask");
  });
});

describe("setTaskStatus", () => {
  it("flips the marker in place", () => {
    const result = setTaskStatus(backlog, "S1.1", "done");
    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;

    expect(parseBacklog(result.value, "demo")[0].status).toBe("done");
    // The DoR fields below the line are untouched.
    expect(result.value).toContain("**Intent:** already here");
  });

  it("changes nothing else in the file", () => {
    const result = setTaskStatus(backlog, "S1.1", "in-progress");
    if (!isOk(result)) throw new Error("expected ok");

    const before = backlog.split("\n");
    const after = result.value.split("\n");
    const changed = after.filter((line, i) => line !== before[i]);

    expect(changed).toEqual(["- → **S1.1** An existing task"]);
  });

  it("reports an unknown id instead of silently doing nothing", () => {
    const result = setTaskStatus(backlog, "NOPE", "done");

    expect(isErr(result)).toBe(true);
    if (isErr(result)) expect(result.error._tag).toBe("TaskNotFound");
  });
});
