import { describe, expect, it } from "vitest";
import { loadBrain } from "@/lib/brain";
import { parseRepo } from "@/lib/content/github/client";
import { createMockGitHubClient, DEMO_GITHUB_FILES } from "@/lib/content/github/mock-client";
import { createGitHubSource } from "@/lib/content/github-source";

const repo = parseRepo("acme/checkout");
if (!repo) throw new Error("fixture repo spec is wrong");

const client = createMockGitHubClient(DEMO_GITHUB_FILES);
const source = createGitHubSource(client, [repo]);

describe("parseRepo", () => {
  it("reads owner/name and defaults the branch", () => {
    expect(parseRepo("acme/checkout")).toEqual({ owner: "acme", name: "checkout", branch: "main" });
  });

  it("accepts an explicit branch", () => {
    expect(parseRepo("acme/checkout#develop")?.branch).toBe("develop");
  });

  it("rejects a malformed spec", () => {
    expect(parseRepo("checkout")).toBeNull();
    expect(parseRepo("")).toBeNull();
  });
});

describe("createGitHubSource", () => {
  it("lists a configured repo as a project", async () => {
    const entries = await source.listProjects();

    expect(entries).toHaveLength(1);
    expect(entries[0].status).toBe("ok");
    if (entries[0].status === "ok") {
      expect(entries[0].meta.slug).toBe("checkout");
      expect(entries[0].root).toBe("acme/checkout");
    }
  });

  it("reports a repo without project.yml as unconfigured, not as a crash", async () => {
    const bare = parseRepo("acme/empty");
    if (!bare) throw new Error("bad spec");
    const entries = await createGitHubSource(client, [bare]).listProjects();

    expect(entries[0].status).toBe("unconfigured");
  });

  /**
   * The walk covers the whole `__project__/` tree, not three fixed folders, so
   * every Markdown file in the repo appears — `tasks/backlog.md` included. The
   * Tasks page renders a *parsed projection* of that file; Docs shows the file
   * itself, which is why both surfaces legitimately reference it.
   */
  it("walks the whole __project__ tree, skipping non-markdown", async () => {
    const docs = await source.listDocs("checkout");

    expect(docs.map((d) => d.relPath)).toEqual([
      "docs/decisions/0001-stripe-over-adyen.md",
      "specs/v1-checkout.md",
      "tasks/backlog.md",
    ]);
  });

  /** Recognised kinds keep their bare ids, so pre-tree URLs still resolve. */
  it("keeps ADR and spec ids bare, and gives loose files a path id", async () => {
    const byRel = new Map((await source.listDocs("checkout")).map((d) => [d.relPath, d]));

    expect(byRel.get("docs/decisions/0001-stripe-over-adyen.md")).toMatchObject({
      kind: "adr",
      id: "0001-stripe-over-adyen",
    });
    expect(byRel.get("specs/v1-checkout.md")).toMatchObject({ kind: "spec", id: "v1-checkout" });
    expect(byRel.get("tasks/backlog.md")).toMatchObject({ kind: "doc", id: "tasks/backlog" });
    expect(byRel.get("docs/decisions/0001-stripe-over-adyen.md")?.title).toContain(
      "Stripe over Adyen",
    );
  });

  it("reads a doc and the backlog", async () => {
    expect(await source.readDoc("checkout", "adr", "0001-stripe-over-adyen")).toContain("Stripe");
    expect(await source.readBacklog("checkout")).toContain("C1.1");
  });

  it("returns null for an unknown project", async () => {
    expect(await source.getProject("nope")).toBeNull();
    expect(await source.readBacklog("nope")).toBeNull();
  });

  /**
   * The whole point of the shared interface: everything built on ContentSource
   * works unchanged over GitHub.
   */
  it("feeds the Brain digest exactly like the filesystem source does", async () => {
    const brain = await loadBrain("checkout", source);

    expect(brain?.decisions.map((d) => d.title)).toEqual(["ADR-0001 — Stripe over Adyen"]);
    expect(brain?.constraints.some((c) => c.text.includes("Saved cards"))).toBe(true);
    // C1.1 is fully specced; C1.2 has only an intent.
    expect(brain?.ready.map((t) => t.id)).toEqual(["C1.1"]);
  });
});
