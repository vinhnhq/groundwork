import { describe, expect, it } from "vitest";
import { renderBrain } from "@/lib/brain/render-brain";
import type { BrainDoc, BrainInput } from "@/lib/brain/types";
import type { ProjectMeta } from "@/lib/content/types";
import type { Task } from "@/lib/tasks/types";

const meta: ProjectMeta = {
  slug: "demo",
  name: "Demo Project",
  tagline: "A project used to prove the digest",
  status: "active",
  visibility: "private",
  stack: ["next", "ts"],
  links: {},
  public_highlights: [],
};

const adr = (id: string, title: string, status: string, decision: string): BrainDoc => ({
  kind: "adr",
  id,
  title,
  body: `# ${title}\n\nStatus: ${status}\n\n## Context\n\nSome background nobody needs in a digest.\n\n## Decision\n\n${decision}\n\n## Consequences\n\nSome fallout.\n`,
});

const spec: BrainDoc = {
  kind: "spec",
  id: "v2-demo",
  title: "v2 — Demo",
  body: [
    "# v2 — Demo",
    "",
    "## 1. Goal",
    "",
    "Ship the thing.",
    "",
    "## 2. Out of scope",
    "",
    "- **Multi-tenant SaaS / billing.** Deferred to v5.",
    "- ~~No team boards.~~ Reversed by ADR-0007.",
    "- **Real-time multi-viewer.** SSE only.",
    "",
    "## 3. Stories",
    "",
    "Lots of prose that is not a constraint.",
  ].join("\n"),
};

const task = (over: Partial<Task> = {}): Task => ({
  id: "G1",
  project: "demo",
  title: "Do the thing",
  status: "todo",
  autonomy: "plan-gated",
  intent: "make X true",
  touches: ["src/lib/x"],
  mustNot: ["src/db"],
  oracle: "unit test passes",
  evidence: [
    { kind: "adr", ref: "ADR-0007" },
    { kind: "file", ref: "x.ts:1" },
  ],
  escalateIf: "the shape drifts",
  ...over,
});

const input = (over: Partial<BrainInput> = {}): BrainInput => ({
  meta,
  docs: [
    adr(
      "0001-content-source",
      "ADR-0001 — Content source",
      "Accepted",
      "Read Markdown from each repo; filesystem first, GitHub when deployed.",
    ),
    adr("0009-dead-end", "ADR-0009 — Dead end", "Superseded", "Store tasks in Postgres."),
    adr("0010-proposal", "ADR-0010 — Proposal", "Proposed", "Maybe use gRPC."),
    spec,
  ],
  tasks: [
    task(),
    task({ id: "G2", title: "Second thing", status: "todo" }),
    task({ id: "G0", title: "Already shipped", status: "done" }),
    task({ id: "G3", title: "Half specced", oracle: undefined, escalateIf: undefined }),
  ],
  ...over,
});

describe("renderBrain", () => {
  it("names the project and its current state", () => {
    const brain = renderBrain(input());
    expect(brain.text).toContain("Demo Project");
    expect(brain.text).toContain("A project used to prove the digest");
    expect(brain.overBudget).toBe(false);
  });

  it("includes only Accepted decisions, with their decision statement", () => {
    const brain = renderBrain(input());

    expect(brain.decisions.map((d) => d.id)).toEqual(["0001-content-source"]);
    expect(brain.decisions[0].statement).toContain("filesystem first");
    // The decision statement, not the Context or Consequences prose.
    expect(brain.text).not.toContain("Some background nobody needs");
    expect(brain.text).not.toContain("Some fallout");
    // Superseded and Proposed ADRs are not "locked".
    expect(brain.text).not.toContain("Store tasks in Postgres");
    expect(brain.text).not.toContain("Maybe use gRPC");
  });

  it("collects open constraints and drops reversed ones", () => {
    const brain = renderBrain(input());
    const texts = brain.constraints.map((c) => c.text);

    expect(texts.some((t) => t.includes("Multi-tenant SaaS"))).toBe(true);
    expect(texts.some((t) => t.includes("Real-time multi-viewer"))).toBe(true);
    // Struck through = no longer a constraint.
    expect(texts.some((t) => t.includes("team boards"))).toBe(false);
    // Prose outside an out-of-scope section is not a constraint.
    expect(texts.some((t) => t.includes("Ship the thing"))).toBe(false);
  });

  it("lists READY tasks only — no done, no draft", () => {
    const brain = renderBrain(input());

    expect(brain.ready.map((t) => t.id)).toEqual(["G1", "G2"]);
    expect(brain.text).not.toContain("Already shipped");
    expect(brain.text).not.toContain("Half specced");
  });

  it("stays within the size budget, dropping tasks before decisions", () => {
    // Squeeze below what the digest naturally wants, so the policy has to bite.
    const natural = renderBrain(input()).text.length;
    const budget = natural - 200;
    const brain = renderBrain(input({ budget }));

    expect(brain.text.length).toBeLessThanOrEqual(budget);
    // The load-bearing part survives the squeeze.
    expect(brain.text).toContain("ADR-0001");
    expect(brain.text).toContain("filesystem first");
    // Tasks are what gave way, not decisions.
    expect(brain.omitted.join(" ")).toMatch(/ready task/);
    expect(brain.overBudget).toBe(false);
  });

  it("flags overBudget when the decisions alone cannot fit", () => {
    const brain = renderBrain(input({ budget: 120 }));

    expect(brain.overBudget).toBe(true);
    expect(brain.omitted.join(" ")).toMatch(/decision/i);
  });

  it("is deterministic — same input, same digest", () => {
    expect(renderBrain(input()).text).toEqual(renderBrain(input()).text);
  });

  it("survives a project with no docs and no tasks", () => {
    const brain = renderBrain({ meta, docs: [], tasks: [] });

    expect(brain.decisions).toEqual([]);
    expect(brain.ready).toEqual([]);
    expect(brain.text).toContain("Demo Project");
    expect(brain.text).toContain("No locked decisions");
  });
});
