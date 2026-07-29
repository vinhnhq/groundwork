import { describe, expect, it } from "vitest";
import type { ContentSource } from "@/lib/content/source";
import type { ProjectEntry, ProjectMeta } from "@/lib/content/types";
import { loadOverview, loadPortfolio, loadProject } from "@/lib/ops/load";

const meta = (over: Partial<ProjectMeta> = {}): ProjectMeta => ({
  slug: "alpha",
  name: "Alpha",
  tagline: "the first one",
  status: "active",
  visibility: "public",
  stack: ["next"],
  links: {},
  public_highlights: ["ships fast"],
  ...over,
});

const BACKLOG = [
  "# Backlog",
  "",
  "- · **A1** Ready task  → **[D]**",
  "    - **Intent:** do the thing",
  "    - **Touches:** src/a   **Must NOT:** src/b",
  "    - **Oracle:** a test",
  "    - **Evidence:** ADR-0001 · src/a.ts:1",
  "    - **Escalate if:** it drifts",
  "",
  "- · **A2** Draft task",
  "    - **Intent:** half specced",
  "",
  "- [x] **A0** Finished task",
  "",
].join("\n");

function makeSource(entries: ProjectEntry[], backlog: string | null = BACKLOG): ContentSource {
  const find = (slug: string) =>
    entries.find((e) => e.status === "ok" && e.meta.slug === slug) as
      | Extract<ProjectEntry, { status: "ok" }>
      | undefined;

  return {
    async listProjects() {
      return entries;
    },
    async getProject(slug) {
      const found = find(slug);
      return found ? { root: found.root, meta: found.meta } : null;
    },
    async listDocs() {
      return [{ kind: "adr" as const, id: "0001", title: "ADR-0001", path: "/x" }];
    },
    async readDoc() {
      return "# ADR-0001";
    },
    async readBacklog() {
      return backlog;
    },
  };
}

describe("loadOverview", () => {
  it("splits open tasks into the READY queue and the DRAFT list", async () => {
    const source = makeSource([{ status: "ok", root: "/a", meta: meta() }]);
    const overview = await loadOverview(source);

    expect(overview.ready.map((t) => t.id)).toEqual(["A1"]);
    expect(overview.draft.map((d) => d.task.id)).toEqual(["A2"]);
    // Done work belongs in neither.
    expect(
      [...overview.ready, ...overview.draft.map((d) => d.task)].map((t) => t.id),
    ).not.toContain("A0");
  });

  it("names the DoR fields each draft is missing", async () => {
    const source = makeSource([{ status: "ok", root: "/a", meta: meta() }]);
    const { draft } = await loadOverview(source);

    expect(draft[0].missing).toEqual(
      expect.arrayContaining(["touches", "mustNot", "oracle", "evidence", "escalateIf"]),
    );
  });

  it("passes unconfigured roots through instead of dropping them", async () => {
    const source = makeSource([
      { status: "ok", root: "/a", meta: meta() },
      { status: "unconfigured", root: "/bare", reason: "no __project__/project.yml" },
    ]);
    const overview = await loadOverview(source);

    expect(overview.projects).toHaveLength(2);
    expect(overview.ready.map((t) => t.id)).toEqual(["A1"]);
  });

  it("survives a project with no backlog", async () => {
    const source = makeSource([{ status: "ok", root: "/a", meta: meta() }], null);
    const overview = await loadOverview(source);

    expect(overview.ready).toEqual([]);
    expect(overview.draft).toEqual([]);
  });

  it("aggregates across projects", async () => {
    const source = makeSource([
      { status: "ok", root: "/a", meta: meta() },
      { status: "ok", root: "/b", meta: meta({ slug: "beta", name: "Beta" }) },
    ]);
    const overview = await loadOverview(source);

    expect(overview.ready).toHaveLength(2);
    expect(overview.ready.map((t) => t.project).sort()).toEqual(["alpha", "beta"]);
  });
});

describe("loadProject", () => {
  it("returns docs and every task, resolved or not", async () => {
    const source = makeSource([{ status: "ok", root: "/a", meta: meta() }]);
    const view = await loadProject("alpha", source);

    expect(view?.name).toBe("Alpha");
    expect(view?.docs).toHaveLength(1);
    expect(view?.tasks.map((t) => t.id)).toEqual(["A1", "A2", "A0"]);
  });

  it("returns null for an unknown slug", async () => {
    const source = makeSource([{ status: "ok", root: "/a", meta: meta() }]);
    expect(await loadProject("nope", source)).toBeNull();
  });
});

describe("loadPortfolio", () => {
  it("exposes only public projects, and only curated fields", async () => {
    const source = makeSource([
      { status: "ok", root: "/a", meta: meta() },
      { status: "ok", root: "/p", meta: meta({ slug: "secret", visibility: "private" }) },
      { status: "unconfigured", root: "/bare", reason: "none" },
    ]);
    const portfolio = await loadPortfolio(source);

    expect(portfolio.map((p) => p.slug)).toEqual(["alpha"]);
    expect(portfolio[0]).toEqual({
      slug: "alpha",
      name: "Alpha",
      tagline: "the first one",
      stack: ["next"],
      highlights: ["ships fast"],
    });
    // No root path leaks into the public projection.
    expect(JSON.stringify(portfolio)).not.toContain("/a");
  });
});
