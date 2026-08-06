import { describe, expect, it } from "vitest";

import { can } from "@/lib/auth/roles";
import { capabilityFor } from "@/lib/auth/route-capability";

describe("capabilityFor", () => {
  it("gates the integrations page", () => {
    expect(capabilityFor("/ops/integrations")).toBe("integrations.view");
  });

  it("gates every triage surface under a project", () => {
    expect(capabilityFor("/ops/sample/triage")).toBe("agent.run");
    // A sub-path must not escape the gate by having more segments.
    expect(capabilityFor("/ops/sample/triage/anything")).toBe("agent.run");
  });

  it("gates both grounding doors", () => {
    expect(capabilityFor("/ops/sample/grounding")).toBe("grounding.read");
    expect(capabilityFor("/ops/sample/context.md")).toBe("grounding.read");
  });

  it("leaves ordinary project pages to the signed-in check alone", () => {
    expect(capabilityFor("/ops")).toBeUndefined();
    expect(capabilityFor("/ops/sample")).toBeUndefined();
    expect(capabilityFor("/ops/sample/tasks")).toBeUndefined();
    expect(capabilityFor("/ops/sample/docs")).toBeUndefined();
  });

  /**
   * The point of the shared table: the edge proxy and the server-side
   * `requireCapability` must agree about every gated route. This pins the
   * role→route outcomes so adding a route to one layer and not the other
   * shows up here rather than as an ungated page.
   */
  it("denies a client every gated route and admits the engineer to all of them", () => {
    const gated = ["/ops/integrations", "/ops/sample/triage", "/ops/sample/context.md"];

    for (const path of gated) {
      const capability = capabilityFor(path);
      expect(capability, path).toBeDefined();
      if (!capability) continue;
      expect(can("client", capability), `client should be denied ${path}`).toBe(false);
      expect(can("engineer", capability), `engineer should reach ${path}`).toBe(true);
    }
  });

  it("lets PM and QA ground but not drive the agent or read integrations", () => {
    expect(can("pm", "grounding.read")).toBe(true);
    expect(can("qa", "grounding.read")).toBe(true);
    expect(can("pm", "agent.run")).toBe(false);
    expect(can("qa", "integrations.view")).toBe(false);
  });
});
