import { describe, expect, it } from "vitest";

import { readiness } from "@/lib/tasks/dor";
import { parseBacklog } from "@/lib/tasks/parse-backlog";

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
