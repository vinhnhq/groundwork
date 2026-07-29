import { describe, expect, it } from "vitest";
import { classifyDoc, isDocFile, titleOfMarkdown } from "./classify-doc";

describe("classifyDoc", () => {
  /**
   * The load-bearing property: URLs minted before the tree existed still
   * resolve. An ADR's id stayed bare (`0008-auth`), it did not become
   * `docs/decisions/0008-auth`.
   */
  it("keeps recognised kinds on a bare id", () => {
    expect(classifyDoc("docs/decisions/0008-auth-username-password.md")).toEqual({
      kind: "adr",
      id: "0008-auth-username-password",
    });
    expect(classifyDoc("specs/v1-foundation.md")).toEqual({ kind: "spec", id: "v1-foundation" });
    expect(classifyDoc("docs/retro.md")).toEqual({ kind: "retro", id: "retro" });
  });

  it("classifies everything else as a path-shaped doc", () => {
    expect(classifyDoc("docs/architecture.md")).toEqual({ kind: "doc", id: "docs/architecture" });
    expect(classifyDoc("docs/tech-standards.md")).toEqual({
      kind: "doc",
      id: "docs/tech-standards",
    });
    expect(classifyDoc("reference/a/b/deep.md")).toEqual({ kind: "doc", id: "reference/a/b/deep" });
  });

  /**
   * A file nested *below* decisions/ is not an ADR — the digest pulls a locked
   * decision from every `adr`, and a sub-note would be quoted as one.
   */
  it("does not treat a nested file under decisions/ as an ADR", () => {
    expect(classifyDoc("docs/decisions/notes/scratch.md")).toEqual({
      kind: "doc",
      id: "docs/decisions/notes/scratch",
    });
  });

  it("is case-insensitive about the extension", () => {
    expect(classifyDoc("specs/v2.MD")).toEqual({ kind: "spec", id: "v2" });
  });
});

describe("isDocFile", () => {
  it("takes Markdown and skips folder chrome", () => {
    expect(isDocFile("architecture.md")).toBe(true);
    expect(isDocFile("README.md")).toBe(false);
    expect(isDocFile("readme.md")).toBe(false);
    expect(isDocFile("project.yml")).toBe(false);
    expect(isDocFile("diagram.png")).toBe(false);
  });
});

describe("titleOfMarkdown", () => {
  it("prefers the first h1", () => {
    expect(titleOfMarkdown("---\nx: 1\n---\n\n# Real Title\n\nbody", "f.md")).toBe("Real Title");
  });

  it("humanises the filename when there is no h1", () => {
    expect(titleOfMarkdown("no heading here", "docs/tech-standards.md")).toBe("tech standards");
  });

  it("ignores deeper headings", () => {
    expect(titleOfMarkdown("## Not the title\n", "a-b.md")).toBe("a b");
  });
});
