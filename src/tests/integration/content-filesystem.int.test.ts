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

  it("lists docs across adr/spec/retro with titles", async () => {
    const docs = await source.listDocs("sample");
    const kinds = docs.map((d) => d.kind).sort();
    expect(kinds).toEqual(["adr", "retro", "spec"]);
    const adr = docs.find((d) => d.kind === "adr");
    expect(adr?.title).toBe("ADR-0001 — Sample decision");
  });

  it("reads a doc body and returns null for a missing one", async () => {
    const body = await source.readDoc("sample", "adr", "0001-sample");
    expect(body).toMatch(/Sample decision/);
    expect(await source.readDoc("sample", "adr", "9999-nope")).toBeNull();
  });
});
