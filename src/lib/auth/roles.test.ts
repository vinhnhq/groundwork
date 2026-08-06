import { describe, expect, it } from "vitest";

import { can } from "@/lib/auth/roles";
import { ROLES } from "@/lib/auth/types";

describe("role capabilities", () => {
  it("lets the engineer do everything", () => {
    expect(can("engineer", "tasks.write")).toBe(true);
    expect(can("engineer", "agent.run")).toBe(true);
    expect(can("engineer", "integrations.view")).toBe(true);
  });

  /** PM/QA run the board but must not spend tokens or see secrets. */
  it("gives PM and QA the board and grounding, but not the agent", () => {
    for (const role of ["pm", "qa"] as const) {
      expect(can(role, "tasks.write")).toBe(true);
      expect(can(role, "grounding.read")).toBe(true);
      expect(can(role, "agent.run")).toBe(false);
      expect(can(role, "integrations.view")).toBe(false);
    }
  });

  it("keeps a client strictly read-only", () => {
    expect(can("client", "ops.view")).toBe(true);
    expect(can("client", "tasks.write")).toBe(false);
    expect(can("client", "grounding.read")).toBe(false);
    expect(can("client", "agent.run")).toBe(false);
  });

  it("lets every role at least see the console", () => {
    for (const role of ROLES) expect(can(role, "ops.view")).toBe(true);
  });

  /** Not a hierarchy: QA can act where a client only reads, but neither is "above". */
  it("is a matrix, not a rank", () => {
    expect(can("qa", "tasks.write") && !can("client", "tasks.write")).toBe(true);
    expect(can("engineer", "agent.run") && !can("qa", "agent.run")).toBe(true);
  });
});
