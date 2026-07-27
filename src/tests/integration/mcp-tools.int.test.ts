import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { createFilesystemSource } from "@/lib/content/filesystem-source";
import type { ContentSource } from "@/lib/content/source";
import { createGroundworkTools, type ToolDef } from "@/mcp/tools";

const fixtures = fileURLToPath(new URL("../fixtures/", import.meta.url));
const source = createFilesystemSource([`${fixtures}repo-ok`, `${fixtures}repo-bare`]);

const tools = createGroundworkTools(source);
const byName = (name: string): ToolDef => {
  const tool = tools.find((t) => t.name === name);
  if (!tool) throw new Error(`no tool ${name}`);
  return tool;
};

describe("MCP tool surface (G3)", () => {
  it("exposes exactly the four v2 read tools", () => {
    expect(tools.map((t) => t.name).sort()).toEqual([
      "get_doc",
      "get_project_context",
      "list_projects",
      "ready_tasks",
    ]);
  });

  it("list_projects names configured projects and flags unconfigured roots", async () => {
    const out = await byName("list_projects").handler({});

    expect(out).toContain("**sample**");
    expect(out).toContain("Sample Project");
    expect(out).toContain("unconfigured");
  });

  it("ready_tasks returns only DoR-passing tasks", async () => {
    const out = await byName("ready_tasks").handler({ project: "sample" });

    // S1.1 is fully specced; S1.2 is missing Oracle/Evidence/Escalate-if.
    expect(out).toContain("S1.1");
    expect(out).not.toContain("S1.2");
  });

  it("ready_tasks spans every project when no slug is given", async () => {
    const out = await byName("ready_tasks").handler({});
    expect(out).toContain("[sample]");
  });

  it("ready_tasks points an agent at list_projects on a bad slug", async () => {
    const out = await byName("ready_tasks").handler({ project: "nope" });
    expect(out).toContain("list_projects");
  });

  it("get_project_context returns the same digest the paste door serves", async () => {
    const out = await byName("get_project_context").handler({ project: "sample" });

    expect(out).toContain("Sample Project — project brain");
    expect(out).toContain("Locked decisions");
    expect(out).toContain("S1.1");
    expect(out).not.toContain("S1.2");
  });

  it("get_doc lists ids when none is given, then reads the doc", async () => {
    const list = await byName("get_doc").handler({ project: "sample", kind: "adr" });
    expect(list).toContain("0001-sample");

    const body = await byName("get_doc").handler({
      project: "sample",
      kind: "adr",
      id: "0001-sample",
    });
    expect(body).toContain("Sample decision");
    expect(body).toContain("Status: Accepted");
  });

  it("get_doc recovers by listing what exists when the id is wrong", async () => {
    const out = await byName("get_doc").handler({ project: "sample", kind: "adr", id: "nope" });
    expect(out).toContain("Available:");
    expect(out).toContain("0001-sample");
  });

  /**
   * The read-only invariant (ADR-0006). S1 will add write methods to
   * ContentSource; this proves the MCP tools never reach for one, so an agent
   * grounding itself cannot rewrite the ground.
   */
  it("no tool touches a write method, even when one exists", async () => {
    const writeAttempts: string[] = [];
    const withWrites = {
      ...source,
      appendTask: async () => {
        writeAttempts.push("appendTask");
        throw new Error("MCP must not write");
      },
      updateTaskStatus: async () => {
        writeAttempts.push("updateTaskStatus");
        throw new Error("MCP must not write");
      },
    } as unknown as ContentSource;

    const guarded = createGroundworkTools(withWrites);
    await Promise.all([
      guarded[0].handler({}),
      guarded[1].handler({ project: "sample" }),
      guarded[2].handler({ project: "sample" }),
      guarded[3].handler({ project: "sample", kind: "adr", id: "0001-sample" }),
    ]);

    expect(writeAttempts).toEqual([]);
    expect(tools.map((t) => t.name).join(" ")).not.toMatch(
      /create|update|write|append|delete|set_/,
    );
  });
});
