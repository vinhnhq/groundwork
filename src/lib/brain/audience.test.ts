import { describe, expect, it } from "vitest";

import { renderBrain } from "./render-brain";
import type { BrainInput } from "./types";

const input: BrainInput = {
  meta: {
    slug: "acme",
    name: "Acme",
    tagline: "A tagline",
    status: "active",
    visibility: "private",
    stack: ["next", "kysely"],
    links: {},
    public_highlights: [],
  },
  docs: [
    {
      kind: "adr",
      id: "0001-x",
      title: "ADR-0001 — Stripe over Adyen",
      body: "# ADR-0001 — Stripe over Adyen\n\n## Decision\n\nWe use Stripe because the fee model is simpler.\n",
    },
    {
      kind: "spec",
      id: "v1",
      title: "v1 — Spec",
      body: "# v1 — Spec\n\n## Out of scope\n\n- No multi-currency in v1.\n",
    },
  ],
  tasks: [
    {
      id: "T1",
      project: "acme",
      title: "Wire the checkout",
      status: "todo",
      autonomy: "dark",
      intent: "take payments",
      touches: ["src/pay"],
      mustNot: ["src/db"],
      oracle: "an e2e pays",
      evidence: [
        { kind: "adr", ref: "0001-x" },
        { kind: "doc", ref: "v1" },
      ],
      escalateIf: "fees change",
    },
  ],
};

describe("audience-scoped digests", () => {
  /**
   * The load-bearing guarantee: ADR-0004/ADR-0006 require the three doors
   * (clipboard, context.md, MCP) to serve byte-identical text. Splitting by
   * audience must not have moved the default output by a single character.
   */
  it("`both` is byte-identical to the un-audienced default", () => {
    expect(renderBrain({ ...input, audience: "both" }).text).toBe(renderBrain(input).text);
  });

  it("`tech` is also byte-identical to the default — it is the full digest", () => {
    expect(renderBrain({ ...input, audience: "tech" }).text).toBe(renderBrain(input).text);
  });

  it("`biz` omits the locked decisions entirely", () => {
    const biz = renderBrain({ ...input, audience: "biz" }).text;

    expect(biz).not.toContain("## Locked decisions");
    // Not just the heading — the reasoning itself must be gone.
    expect(biz).not.toContain("Stripe over Adyen");
    expect(biz).not.toContain("fee model is simpler");
  });

  it("`biz` keeps what a delivery conversation needs", () => {
    const biz = renderBrain({ ...input, audience: "biz" }).text;

    expect(biz).toContain("# Acme — project brain");
    expect(biz).toContain("Status: **active**");
    expect(biz).toContain("## Open constraints");
    expect(biz).toContain("No multi-currency in v1");
    expect(biz).toContain("## Ready tasks");
    expect(biz).toContain("Wire the checkout");
  });

  it("`biz` swaps the doc-internals line for a progress line", () => {
    const biz = renderBrain({ ...input, audience: "biz" }).text;
    expect(biz).not.toContain("locked decision(s)");
    expect(biz).toContain("- Progress:");
  });

  it("`biz` says the rationale is withheld rather than pretending it does not exist", () => {
    expect(renderBrain({ ...input, audience: "biz" }).text).toContain("deliberately not included");
  });

  it("every audience still respects the size budget", () => {
    for (const audience of ["tech", "biz", "both"] as const) {
      const brain = renderBrain({ ...input, audience, budget: 600 });
      expect(brain.text.length, audience).toBeLessThanOrEqual(600);
    }
  });
});

/**
 * Dropping the decisions section was not sufficient on its own. A task's
 * `intent` says *why* and its `oracle` says *how we will know* — both are
 * internal reasoning, and this project's own backlog proved the leak: the W6
 * ticket's rationale was being quoted verbatim into the delivery digest.
 */
describe("biz does not leak rationale through task rows", () => {
  const leaky: BrainInput = {
    ...input,
    tasks: [
      {
        ...input.tasks[0]!,
        title: "Wire the checkout",
        intent: "because Adyen's fees would sink the margin",
        oracle: "an e2e pays with a live Stripe key",
      },
    ],
  };

  it("keeps the headline and drops the reasoning", () => {
    const biz = renderBrain({ ...leaky, audience: "biz" }).text;

    expect(biz).toContain("Wire the checkout");
    expect(biz).not.toContain("Adyen's fees");
    expect(biz).not.toContain("Oracle:");
    expect(biz).not.toContain("Tier:");
  });

  it("still gives an engineer's agent the full row", () => {
    const tech = renderBrain({ ...leaky, audience: "tech" }).text;

    expect(tech).toContain("Adyen's fees");
    expect(tech).toContain("Oracle: an e2e pays");
  });
});
