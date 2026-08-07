import { describe, expect, it } from "vitest";

import { readiness } from "@/lib/tasks/dor";
import { parseBacklog, parseBacklogReport } from "@/lib/tasks/parse-backlog";

const md = `
# Backlog

### F0 · Scaffold  → **[P]**

- · **F0.1** Repo scaffold
    - **Intent:** stand up the app
    - **Touches:** repo root · package.json   **Must NOT:** __project__/** docs
    - **Oracle:** \`bun run build\` green
    - **Evidence:** tech-standards §0 · architecture §11
    - **Escalate if:** create-next-app conflicts

### F1 · Core  → **[D]**

- · **F1.1** A ready task
    - **Intent:** do it
    - **Touches:** src/lib
    - **Must NOT:** src/db
    - **Oracle:** tests pass
    - **Evidence:** ADR-0012 · src/lib/context.ts:1 · a test
    - **Escalate if:** probe differs

- · **F1.2** Missing evidence + oracle
    - **Intent:** partial
    - **Touches:** src/x
    - **Must NOT:** src/y
    - **Evidence:** just one doc

- [x] **F1.3** A done task
    - **Intent:** done thing

- ✎ **F1.4** A draft with a per-task tier → **[T]**
`;

describe("parseBacklog", () => {
  const tasks = parseBacklog(md, "demo");
  const byId = (id: string) => tasks.find((t) => t.id === id);

  it("parses all task blocks", () => {
    expect(tasks.map((t) => t.id)).toEqual(["F0.1", "F1.1", "F1.2", "F1.3", "F1.4"]);
  });

  it("inherits the section tier and reads status from markers", () => {
    expect(byId("F0.1")?.autonomy).toBe("plan-gated");
    expect(byId("F1.1")?.autonomy).toBe("dark");
    expect(byId("F1.3")?.status).toBe("done");
    expect(byId("F1.1")?.status).toBe("todo");
  });

  it("splits Touches / Must NOT even when they share a line", () => {
    const t = byId("F0.1");
    expect(t?.touches).toEqual(["repo root", "package.json"]);
    expect(t?.mustNot).toEqual(["__project__/** docs"]);
  });

  it("parses and classifies evidence items", () => {
    const t = byId("F1.1");
    expect(t?.evidence).toHaveLength(3);
    expect(t?.evidence.map((e) => e.kind)).toEqual(["adr", "file", "test"]);
  });

  it("a fully-specced task derives READY", () => {
    expect(readiness(byId("F1.1")!).ready).toBe(true);
    expect(readiness(byId("F0.1")!).ready).toBe(true);
  });

  it("a partial task derives NOT ready with named gaps", () => {
    const r = readiness(byId("F1.2")!);
    expect(r.ready).toBe(false);
    expect(r.missing).toEqual(expect.arrayContaining(["oracle", "evidence", "escalateIf"]));
  });

  it("honors a per-task tier override", () => {
    expect(byId("F1.4")?.autonomy).toBe("trivial");
    // trivial ⇒ ready despite empty fields
    expect(readiness(byId("F1.4")!).ready).toBe(true);
  });
});

/**
 * The parser stays strict; the dropping stops being silent (Q5). Three real
 * backlog edits vanished without a trace — an unknown marker, an id with `/`
 * — and nothing anywhere said so.
 */
describe("parseBacklogReport", () => {
  const offGrammar = [
    "## Section → **[P]**",
    "",
    "- · **T1** Parses fine.",
    "  - **Intent:** works",
    "- [~] **F5** Unknown marker — off-grammar.",
    "- · **US-3/US-4** Slash in the id — off-grammar.",
    "- plain prose bullet, no bold token.",
    "",
    "> - **Note:** a field-labelled bullet is not a task.",
  ].join("\n");

  it("still returns the tasks the grammar accepts", () => {
    const { tasks } = parseBacklogReport(offGrammar, "demo");
    expect(tasks.map((t) => t.id)).toEqual(["T1"]);
  });

  it("names each task-shaped line it dropped, with its line number", () => {
    const { skipped } = parseBacklogReport(offGrammar, "demo");
    expect(skipped.map((s) => s.line)).toEqual([5, 6]);
    expect(skipped[0].text).toContain("[~] **F5**");
    expect(skipped[1].text).toContain("US-3/US-4");
  });

  it("stays quiet on prose bullets and field labels — no noise", () => {
    const clean = [
      "- · **T2** Fine. → **[D]**",
      "  - **Oracle:** covered",
      "- just a thought for later",
      "- see **ADR-0004** for the policy",
      "- **Multi-tenant SaaS / billing.** Deferred to v5.",
      "- **Touches**: colon outside the bold",
    ].join("\n");
    expect(parseBacklogReport(clean, "demo").skipped).toEqual([]);
  });

  it("parseBacklog keeps its original shape for existing callers", () => {
    expect(parseBacklog(offGrammar, "demo").map((t) => t.id)).toEqual(["T1"]);
  });
});
