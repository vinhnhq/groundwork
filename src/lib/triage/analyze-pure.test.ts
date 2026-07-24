import { describe, expect, it } from "vitest";
import { analyzeIdeaPure, type DocLite, type TaskLite } from "@/lib/triage/analyze-pure";

const docs: DocLite[] = [
  { kind: "adr", id: "0007", title: "ADR-0007 — Event sourcing and the Decider pattern" },
];
const tasks: TaskLite[] = [
  { id: "S1.1", title: "Add search over the debate corpus", intent: "let users find debates" },
];

describe("analyzeIdeaPure", () => {
  it("flags a duplicate when overlap with a task is high", () => {
    const r = analyzeIdeaPure("Add full-text search over the debate corpus for users", docs, tasks);
    expect(r.kind).toBe("duplicate");
    expect(r.citations.some((c) => c.ref === "S1.1")).toBe(true);
  });

  it("flags needs-spike for a vague idea", () => {
    const r = analyzeIdeaPure("maybe we could explore something", docs, tasks);
    expect(r.kind).toBe("needs-spike");
    expect(r.draft.escalateIf).toBeTruthy();
  });

  it("treats a novel idea as a new task and drafts an intent", () => {
    const r = analyzeIdeaPure(
      "Export monthly revenue reports as downloadable spreadsheets",
      docs,
      tasks,
    );
    expect(r.kind).toBe("new-task");
    expect(r.draft.intent).toContain("Export monthly revenue");
    // boundaries + oracle are left for the human to ground
    expect(r.draft.touches).toEqual([]);
    expect(r.draft.oracle).toBeUndefined();
  });

  it("guesses a supervised tier for risky domains", () => {
    const r = analyzeIdeaPure("change the payment schema and money ledger", docs, tasks);
    expect(r.draft.autonomy).toBe("supervised");
  });

  it("guesses a dark tier for mechanical work", () => {
    const r = analyzeIdeaPure("add i18n strings and rename a test helper", docs, tasks);
    expect(r.draft.autonomy).toBe("dark");
  });
});
