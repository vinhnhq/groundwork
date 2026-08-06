import { describe, expect, it } from "vitest";

import { buildDocTree, type DocFolder } from "./doc-tree";
import type { DocRef } from "./types";

const ref = (relPath: string, kind: DocRef["kind"], id: string, title = "T"): DocRef => ({
  kind,
  id,
  title,
  path: `/abs/__project__/${relPath}`,
  relPath,
});

const docs: DocRef[] = [
  ref("specs/v1-foundation.md", "spec", "v1-foundation"),
  ref("docs/architecture.md", "doc", "docs/architecture"),
  ref("docs/decisions/0002-write-back.md", "adr", "0002-write-back"),
  ref("docs/decisions/0001-content-source.md", "adr", "0001-content-source"),
  ref("docs/retro.md", "retro", "retro"),
];

describe("buildDocTree", () => {
  const tree = buildDocTree(docs, "gw");

  it("mirrors the repo's folder structure", () => {
    expect(tree.map((n) => n.name)).toEqual(["docs", "specs"]);

    const docsFolder = tree[0] as DocFolder;
    // Folders before files, each group alphabetical.
    expect(docsFolder.children.map((c) => c.name)).toEqual([
      "decisions",
      "architecture.md",
      "retro.md",
    ]);
  });

  it("counts documents at and below each folder", () => {
    const docsFolder = tree[0] as DocFolder;
    expect(docsFolder.count).toBe(4);
    expect((docsFolder.children[0] as DocFolder).count).toBe(2);
    expect((tree[1] as DocFolder).count).toBe(1);
  });

  it("links a recognised kind at its short URL", () => {
    const adrs = (tree[0] as DocFolder).children[0] as DocFolder;
    expect(adrs.children.map((c) => c.type === "doc" && c.href)).toEqual([
      "/ops/gw/adr/0001-content-source",
      "/ops/gw/adr/0002-write-back",
    ]);
  });

  /** A `doc` id is a path; each segment is encoded, the separators are not. */
  it("links a path-shaped doc without escaping its separators", () => {
    const arch = (tree[0] as DocFolder).children.find((c) => c.name === "architecture.md");
    expect(arch?.type === "doc" && arch.href).toBe("/ops/gw/doc/docs/architecture");
  });

  it("escapes characters inside a segment", () => {
    const tricky = buildDocTree([ref("docs/a b.md", "doc", "docs/a b")], "gw");
    const leaf = (tricky[0] as DocFolder).children[0];
    expect(leaf.type === "doc" && leaf.href).toBe("/ops/gw/doc/docs/a%20b");
  });

  it("handles a file at the root of __project__", () => {
    const flat = buildDocTree([ref("notes.md", "doc", "notes")], "gw");
    expect(flat).toHaveLength(1);
    expect(flat[0]?.type).toBe("doc");
  });

  it("returns nothing for no docs", () => {
    expect(buildDocTree([], "gw")).toEqual([]);
  });
});
