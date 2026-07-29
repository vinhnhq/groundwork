import type { DocKind, DocRef } from "@/lib/content/types";

export type DocLeaf = {
  type: "doc";
  name: string;
  title: string;
  kind: DocKind;
  /** `/ops/<project>/<kind>/<id>` — the id may itself contain slashes. */
  href: string;
};

export type DocFolder = {
  type: "folder";
  name: string;
  /** `__project__`-relative, so it is stable as a React key and an open-state id. */
  path: string;
  children: DocNode[];
  /** Documents at or below this folder — the count the folder row shows. */
  count: number;
};

export type DocNode = DocFolder | DocLeaf;

/**
 * Build the folder tree the Docs page renders.
 *
 * Pure and source-agnostic: it keys on `relPath`, which both adapters produce
 * in the same forward-slash form, so the tree is identical whether the docs
 * came off a local disk or the GitHub API.
 *
 * Folders sort before files and each group sorts by name, which is what makes
 * the tree read like the repo rather than like the order the walk happened to
 * return.
 */
export function buildDocTree(docs: readonly DocRef[], projectSlug: string): DocNode[] {
  const root: DocFolder = { type: "folder", name: "", path: "", children: [], count: 0 };

  for (const doc of docs) {
    const segments = doc.relPath.split("/");
    const fileName = segments.pop();
    if (!fileName) continue;

    let cursor = root;
    for (const segment of segments) {
      const path = cursor.path ? `${cursor.path}/${segment}` : segment;
      let next = cursor.children.find(
        (c): c is DocFolder => c.type === "folder" && c.name === segment,
      );
      if (!next) {
        next = { type: "folder", name: segment, path, children: [], count: 0 };
        cursor.children.push(next);
      }
      cursor = next;
    }

    cursor.children.push({
      type: "doc",
      name: fileName,
      title: doc.title,
      kind: doc.kind,
      // The id can contain slashes; each segment is encoded separately so a
      // literal `/` stays a path separator and everything else stays escaped.
      href: `/ops/${projectSlug}/${doc.kind}/${doc.id.split("/").map(encodeURIComponent).join("/")}`,
    });
  }

  countAndSort(root);
  return root.children;
}

/** Depth-first: fill each folder's count, then order its children. */
function countAndSort(folder: DocFolder): number {
  let total = 0;
  for (const child of folder.children) {
    total += child.type === "folder" ? countAndSort(child) : 1;
  }
  folder.count = total;

  folder.children.sort((a, b) => {
    if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return total;
}

/** Every folder path in the tree — the Docs page opens them all by default. */
export function allFolderPaths(nodes: readonly DocNode[]): string[] {
  return nodes.flatMap((n) => (n.type === "folder" ? [n.path, ...allFolderPaths(n.children)] : []));
}
