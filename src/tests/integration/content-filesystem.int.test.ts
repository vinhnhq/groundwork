import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createFilesystemSource } from "@/lib/content/filesystem-source";

const FIX = join(process.cwd(), "src", "tests", "fixtures");
const repoOk = join(FIX, "repo-ok");
const repoBare = join(FIX, "repo-bare");

describe("filesystem content source", () => {
  const source = createFilesystemSource([repoOk, repoBare]);

  it("lists a configured project and marks a bare root unconfigured", async () => {
    const entries = await source.listProjects();
    expect(entries).toHaveLength(2);
    const ok = entries.find((e) => e.status === "ok");
    const bare = entries.find((e) => e.status === "unconfigured");
    expect(ok?.status).toBe("ok");
    if (ok?.status === "ok") expect(ok.meta.slug).toBe("sample");
    expect(bare?.status).toBe("unconfigured");
  });

  it("gets a project by slug", async () => {
    const p = await source.getProject("sample");
    expect(p?.meta.name).toBe("Sample Project");
    expect(await source.getProject("nope")).toBeNull();
  });

  /**
   * The walk covers the whole `__project__/` tree, so a file outside the three
   * formerly hard-coded folders (here `tasks/backlog.md`) is ingested as a
   * generic `doc`. That omission is the reason this changed: `architecture.md`
   * and `tech-standards.md` had been invisible to the console.
   */
  it("walks the whole __project__ tree, classifying each file", async () => {
    const docs = await source.listDocs("sample");

    expect(docs.map((d) => d.relPath).sort()).toEqual([
      "docs/decisions/0001-sample.md",
      "docs/retro.md",
      "specs/v1-foo.md",
      "tasks/backlog.md",
    ]);

    const byRel = new Map(docs.map((d) => [d.relPath, d]));
    expect(byRel.get("docs/decisions/0001-sample.md")).toMatchObject({
      kind: "adr",
      id: "0001-sample",
      title: "ADR-0001 — Sample decision",
    });
    expect(byRel.get("specs/v1-foo.md")?.kind).toBe("spec");
    expect(byRel.get("docs/retro.md")?.kind).toBe("retro");
    // Outside the recognised folders ⇒ a path-shaped id, reachable at
    // /ops/<slug>/doc/tasks/backlog.
    expect(byRel.get("tasks/backlog.md")).toMatchObject({ kind: "doc", id: "tasks/backlog" });
  });

  it("does not ingest non-markdown assets sitting beside the docs", async () => {
    const docs = await source.listDocs("sample");
    expect(docs.some((d) => d.relPath.endsWith(".png"))).toBe(false);
  });

  it("reads a doc body and returns null for a missing one", async () => {
    const body = await source.readDoc("sample", "adr", "0001-sample");
    expect(body).toMatch(/Sample decision/);
    expect(await source.readDoc("sample", "adr", "9999-nope")).toBeNull();
  });
});
