import type { DocKind } from "@/lib/content/types";

/**
 * Where a `__project__`-relative path lands in the doc model.
 *
 * Shared by both sources so the filesystem and GitHub adapters cannot disagree
 * about what an ADR is — they walk different trees but must produce the same
 * `kind` and `id` for the same repo, or a doc's URL would change with the
 * transport.
 *
 * `relPath` uses forward slashes in both adapters (the filesystem one converts),
 * because it is also a URL path segment.
 */
export function classifyDoc(relPath: string): { kind: DocKind; id: string } {
  const noExt = relPath.replace(/\.md$/i, "");

  // The recognised kinds keep a *bare* id, so every URL minted before the tree
  // existed still resolves. Only `doc` carries a path-shaped id.
  if (/^docs\/decisions\/[^/]+$/.test(noExt)) {
    return { kind: "adr", id: noExt.slice("docs/decisions/".length) };
  }
  if (/^specs\/[^/]+$/.test(noExt)) {
    return { kind: "spec", id: noExt.slice("specs/".length) };
  }
  if (noExt === "docs/retro") {
    return { kind: "retro", id: "retro" };
  }
  return { kind: "doc", id: noExt };
}

/** `README.md` in a docs folder is folder chrome, not a document. */
export const isDocFile = (name: string): boolean =>
  name.toLowerCase().endsWith(".md") && name.toLowerCase() !== "readme.md";

/** First `# ` heading, else a humanised filename. */
export function titleOfMarkdown(markdown: string, fallbackFile: string): string {
  const heading = markdown.split("\n").find((l) => l.startsWith("# "));
  if (heading) return heading.slice(2).trim();
  const base = fallbackFile.split("/").pop() ?? fallbackFile;
  return base.replace(/\.md$/i, "").replace(/[-_]/g, " ");
}
