import { describe, expect, it } from "vitest";

import { isReady, isStartable, readiness } from "@/lib/tasks/dor";
import type { Task } from "@/lib/tasks/types";

const full = (over: Partial<Task> = {}): Task => ({
  id: "F1.1",
  project: "demo",
  title: "Do the thing",
  status: "todo",
  autonomy: "dark",
  intent: "make X true",
  touches: ["src/lib/x"],
  mustNot: ["src/db"],
  oracle: "unit test passes",
  evidence: [
    { kind: "adr", ref: "ADR-0007" },
    { kind: "file", ref: "x.ts:1" },
  ],
  escalateIf: "shape is irregular",
  ...over,
});

describe("readiness (DoR deriver)", () => {
  it("a fully-specced task is READY", () => {
    const r = readiness(full());
    expect(r.ready).toBe(true);
    expect(r.missing).toEqual([]);
  });

  it("names each missing field", () => {
    expect(readiness(full({ intent: "" })).missing).toEqual(["intent"]);
    expect(readiness(full({ autonomy: undefined })).missing).toEqual(["autonomy"]);
    expect(readiness(full({ touches: [] })).missing).toEqual(["touches"]);
    expect(readiness(full({ mustNot: [] })).missing).toEqual(["mustNot"]);
    expect(readiness(full({ oracle: "  " })).missing).toEqual(["oracle"]);
    expect(readiness(full({ escalateIf: undefined })).missing).toEqual(["escalateIf"]);
  });

  it("requires ≥2 evidences (presume, not assume)", () => {
    expect(readiness(full({ evidence: [{ kind: "adr", ref: "ADR-1" }] })).missing).toEqual([
      "evidence",
    ]);
    expect(readiness(full({ evidence: [] })).missing).toEqual(["evidence"]);
    expect(
      isReady(
        full({
          evidence: [
            { kind: "adr", ref: "a" },
            { kind: "doc", ref: "b" },
          ],
        }),
      ),
    ).toBe(true);
  });

  it("collects multiple missing fields", () => {
    const r = readiness(full({ oracle: "", evidence: [], escalateIf: "" }));
    expect(r.ready).toBe(false);
    expect(r.missing).toEqual(["oracle", "evidence", "escalateIf"]);
  });

  it("exempts trivial-tier tasks", () => {
    const trivial: Task = {
      id: "T",
      project: "demo",
      title: "typo fix",
      status: "todo",
      autonomy: "trivial",
      touches: [],
      mustNot: [],
      evidence: [],
    };
    expect(isReady(trivial)).toBe(true);
  });

  it("isStartable requires ready AND an open status", () => {
    expect(isStartable(full())).toBe(true);
    expect(isStartable(full({ status: "done" }))).toBe(false);
    expect(isStartable(full({ status: "in-progress" }))).toBe(false);
    expect(isStartable(full({ status: "stretch" }))).toBe(true);
    expect(isStartable(full({ oracle: "" }))).toBe(false);
  });
});
