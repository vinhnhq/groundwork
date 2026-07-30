import { describe, expect, it } from "vitest";
import { filterDocs, type MentionDoc, mentionAt, wrapIndex } from "./doc-mention";

describe("mentionAt", () => {
  it("finds the token under the caret", () => {
    expect(mentionAt("tag @arch", 9)).toEqual({ start: 4, query: "arch" });
    expect(mentionAt("@", 1)).toEqual({ start: 0, query: "" });
  });

  /** A mention ends at whitespace, or the menu stays open for the rest of the sentence. */
  it("ends at whitespace", () => {
    expect(mentionAt("@arch and then some", 19)).toBeNull();
  });

  /** An email address mid-sentence must not open a file picker. */
  it("requires the @ to start a word", () => {
    expect(mentionAt("mail me at vinh@example.com", 27)).toBeNull();
    expect(mentionAt("a@b", 3)).toBeNull();
  });

  it("uses the caret, not the end of the string", () => {
    // Caret sits right after "@ar"; the rest of the line is ahead of it.
    expect(mentionAt("see @ar later", 7)).toEqual({ start: 4, query: "ar" });
  });

  it("takes the nearest @ behind the caret", () => {
    expect(mentionAt("@one @two", 9)).toEqual({ start: 5, query: "two" });
  });

  it("returns null with no @ at all", () => {
    expect(mentionAt("no mention here", 15)).toBeNull();
  });
});

describe("filterDocs", () => {
  const docs: MentionDoc[] = [
    { id: "0008-auth", kind: "adr", title: "ADR-0008 — better-auth", relPath: "docs/decisions/0008-auth.md" },
    { id: "docs/architecture", kind: "doc", title: "Architecture", relPath: "docs/architecture.md" },
    { id: "v1", kind: "spec", title: "v1 — Foundation", relPath: "specs/v1.md" },
  ];

  it("returns everything for an empty query", () => {
    expect(filterDocs(docs, "")).toHaveLength(3);
    expect(filterDocs(docs, "   ")).toHaveLength(3);
  });

  it("matches on title, case-insensitively", () => {
    expect(filterDocs(docs, "ARCH").map((d) => d.id)).toEqual(["docs/architecture"]);
  });

  it("matches on the path, so a folder name finds its files", () => {
    expect(filterDocs(docs, "decisions").map((d) => d.id)).toEqual(["0008-auth"]);
    expect(filterDocs(docs, "specs/").map((d) => d.id)).toEqual(["v1"]);
  });

  it("matches on the id", () => {
    expect(filterDocs(docs, "0008").map((d) => d.id)).toEqual(["0008-auth"]);
  });

  it("returns nothing when nothing matches", () => {
    expect(filterDocs(docs, "zzz")).toEqual([]);
  });
});

describe("wrapIndex", () => {
  it("cycles both ways so the arrows never dead-end", () => {
    expect(wrapIndex(0, 3)).toBe(0);
    expect(wrapIndex(3, 3)).toBe(0);
    expect(wrapIndex(-1, 3)).toBe(2);
    expect(wrapIndex(-4, 3)).toBe(2);
  });

  it("is safe on an empty list", () => {
    expect(wrapIndex(-1, 0)).toBe(0);
  });
});
