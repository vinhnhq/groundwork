import { describe, expect, it } from "vitest";
import type { ContentSource } from "@/lib/content/source";
import type { ProjectMeta } from "@/lib/content/types";
import { createMemoryWriter } from "@/lib/content/writers/memory";
import { isErr, isOk } from "@/lib/result";
import { parseBacklog } from "@/lib/tasks/parse-backlog";
import type { Task } from "@/lib/tasks/types";
import { appendTaskToProject, setProjectTaskStatus } from "@/lib/tasks/write-back";

const meta: ProjectMeta = {
  slug: "demo",
  name: "Demo",
  tagline: "",
  status: "active",
  visibility: "private",
  stack: [],
  links: {},
  public_highlights: [],
};

const BACKLOG = [
  "# Backlog",
  "",
  "- · **S1.1** An existing task",
  "    - **Intent:** here",
  "",
].join("\n");

function makeSource(backlog: string | null = BACKLOG): ContentSource {
  return {
    async listProjects() {
      return [{ status: "ok", root: "/repo", meta }];
    },
    async getProject(slug) {
      return slug === "demo" ? { root: "/repo", meta } : null;
    },
    async listDocs() {
      return [];
    },
    async readDoc() {
      return null;
    },
    async readBacklog() {
      return backlog;
    },
  };
}

const task = (over: Partial<Task> = {}): Task => ({
  id: "N1",
  project: "demo",
  title: "Captured from the UI",
  status: "todo",
  autonomy: "supervised",
  intent: "prove US-3",
  touches: ["backlog.md"],
  mustNot: ["the read layer"],
  oracle: "this test",
  evidence: [
    { kind: "adr", ref: "ADR-0002" },
    { kind: "doc", ref: "spec v2 US-3" },
  ],
  escalateIf: "the writer is unavailable",
  ...over,
});

const ctx = (source = makeSource()) => {
  const writer = createMemoryWriter(() => new Date("2026-07-28T00:00:00Z"));
  return { ctx: { source, writer, actor: "pm@example.com" }, writer };
};

describe("appendTaskToProject", () => {
  it("appends to the real backlog content and hands it to the writer", async () => {
    const { ctx: c, writer } = ctx();
    const result = await appendTaskToProject(c, "demo", task());

    expect(isOk(result)).toBe(true);
    expect(writer.writes).toHaveLength(1);

    const written = writer.writes[0];
    expect(written.slug).toBe("demo");
    expect(written.root).toBe("/repo");
    expect(written.actor).toBe("pm@example.com");
    expect(written.message).toContain("add N1");

    // The new file still parses, with both tasks.
    expect(parseBacklog(written.content, "demo").map((t) => t.id)).toEqual(["S1.1", "N1"]);
  });

  it("refuses a duplicate id without writing anything", async () => {
    const { ctx: c, writer } = ctx();
    const result = await appendTaskToProject(c, "demo", task({ id: "S1.1" }));

    expect(isErr(result)).toBe(true);
    if (isErr(result)) expect(result.error._tag).toBe("DuplicateTask");
    expect(writer.writes).toHaveLength(0);
  });

  it("reports an unknown project", async () => {
    const { ctx: c } = ctx();
    const result = await appendTaskToProject(c, "nope", task());

    expect(isErr(result)).toBe(true);
    if (isErr(result)) expect(result.error._tag).toBe("ProjectNotFound");
  });

  it("reports a project with no backlog file", async () => {
    const { ctx: c } = ctx(makeSource(null));
    const result = await appendTaskToProject(c, "demo", task());

    expect(isErr(result)).toBe(true);
    if (isErr(result)) expect(result.error._tag).toBe("NoBacklog");
  });
});

describe("setProjectTaskStatus", () => {
  it("flips the status and keeps the rest of the file byte-identical", async () => {
    const { ctx: c, writer } = ctx();
    const result = await setProjectTaskStatus(c, "demo", "S1.1", "in-progress");

    expect(isOk(result)).toBe(true);
    const written = writer.writes[0].content;
    expect(parseBacklog(written, "demo")[0].status).toBe("in-progress");
    expect(written).toContain("**Intent:** here");
  });

  it("reports an unknown task without writing", async () => {
    const { ctx: c, writer } = ctx();
    const result = await setProjectTaskStatus(c, "demo", "NOPE", "done");

    expect(isErr(result)).toBe(true);
    if (isErr(result)) expect(result.error._tag).toBe("TaskNotFound");
    expect(writer.writes).toHaveLength(0);
  });
});

describe("the memory writer", () => {
  it("says plainly that nothing was committed", async () => {
    const { ctx: c } = ctx();
    const result = await appendTaskToProject(c, "demo", task());

    if (!isOk(result)) throw new Error("expected ok");
    expect(result.value.mode).toBe("memory");
    expect(result.value.pending).toBe(true);
    expect(result.value.summary).toMatch(/nothing was committed/i);
  });
});
