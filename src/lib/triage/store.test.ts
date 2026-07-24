import { describe, expect, it } from "vitest";
import { readiness } from "@/lib/tasks/dor";
import { parseBacklog } from "@/lib/tasks/parse-backlog";
import { listAccepted, recordAccepted, renderBacklogBlock } from "@/lib/triage/store";
import type { DraftTicket } from "@/lib/triage/types";

describe("triage store", () => {
  it("renders a block that parses back to a READY task (closes the loop)", () => {
    const draft: DraftTicket = {
      id: "NEW",
      title: "Do the thing",
      autonomy: "dark",
      intent: "make X true",
      touches: ["src/x"],
      mustNot: ["src/y"],
      oracle: "tests pass",
      evidence: [
        { kind: "adr", ref: "ADR-1" },
        { kind: "doc", ref: "spec-x" },
      ],
      escalateIf: "shape drifts",
    };
    const block = renderBacklogBlock(draft);
    const [task] = parseBacklog(`### Section\n${block}`, "p");
    expect(task.id).toBe("NEW");
    expect(task.autonomy).toBe("dark");
    expect(readiness(task).ready).toBe(true);
  });

  it("records accepted tickets per project", () => {
    recordAccepted("proj-a", { id: "NEW", title: "t", touches: [], mustNot: [], evidence: [] });
    expect(listAccepted("proj-a").length).toBe(1);
    expect(listAccepted("proj-b").length).toBe(0);
  });
});
