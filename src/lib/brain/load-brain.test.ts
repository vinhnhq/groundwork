import { describe, expect, it } from "vitest";
import { loadBrain } from "@/lib/brain/load-brain";
import type { ContentSource } from "@/lib/content/source";
import type { DocRef, ProjectMeta } from "@/lib/content/types";

const meta: ProjectMeta = {
  slug: "demo",
  name: "Demo Project",
  tagline: "wired end to end",
  status: "active",
  visibility: "private",
  stack: [],
  links: {},
  public_highlights: [],
};

const docs: DocRef[] = [
  {
    kind: "adr",
    id: "0001-x",
    title: "ADR-0001 — X",
    path: "/x",
    relPath: "docs/decisions/0001-x.md",
  },
  { kind: "spec", id: "v1", title: "v1 — Spec", path: "/s", relPath: "specs/v1.md" },
];

const bodies: Record<string, string> = {
  "adr:0001-x": "# ADR-0001 — X\n\nStatus: Accepted\n\n## Decision\n\nAlways read from the repo.\n",
  "spec:v1": "# v1 — Spec\n\n## Out of scope\n\n- **Billing.** Later.\n",
};

const source: ContentSource = {
  async listProjects() {
    return [{ status: "ok", root: "/repo", meta }];
  },
  async getProject(slug) {
    return slug === "demo" ? { root: "/repo", meta } : null;
  },
  async listDocs() {
    return docs;
  },
  async readDoc(_slug, kind, id) {
    return bodies[`${kind}:${id}`] ?? null;
  },
  async readBacklog() {
    return [
      "# Backlog",
      "",
      "- · **T1** Wire it up  → **[P]**",
      "    - **Intent:** prove the loader",
      "    - **Touches:** src/a",
      "    - **Must NOT:** src/b",
      "    - **Oracle:** this test",
      "    - **Evidence:** ADR-0001 · src/a.ts:1",
      "    - **Escalate if:** it drifts",
    ].join("\n");
  },
};

describe("loadBrain", () => {
  it("assembles a digest from a ContentSource", async () => {
    const brain = await loadBrain("demo", source);

    expect(brain).not.toBeNull();
    expect(brain?.decisions.map((d) => d.id)).toEqual(["0001-x"]);
    expect(brain?.constraints[0].text).toContain("Billing");
    expect(brain?.ready.map((t) => t.id)).toEqual(["T1"]);
    expect(brain?.text).toContain("Demo Project");
  });

  it("returns null for an unknown project", async () => {
    expect(await loadBrain("nope", source)).toBeNull();
  });

  it("threads a caller-supplied budget through to the digest", async () => {
    const roomy = await loadBrain("demo", source);
    const tight = await loadBrain("demo", source, 300);

    expect(tight?.text.length ?? 0).toBeLessThan(roomy?.text.length ?? 0);
    expect(tight?.omitted.length ?? 0).toBeGreaterThan(0);
  });
});
