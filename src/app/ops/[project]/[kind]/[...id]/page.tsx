import { notFound } from "next/navigation";
import { Markdown } from "@/components/markdown";
import { getContentSource } from "@/lib/content";
import { isDocKind } from "@/lib/content/types";

export const dynamic = "force-dynamic";

/**
 * A catch-all segment, because a `doc` id is a path.
 *
 * The recognised kinds keep single-segment ids (`adr/0008-auth`), so every URL
 * minted before the tree existed still resolves here; only `doc` arrives as
 * multiple segments (`doc/docs/architecture`).
 */
export default async function DocPage({
  params,
}: {
  params: Promise<{ project: string; kind: string; id: string[] }>;
}) {
  const { project, kind, id } = await params;
  if (!isDocKind(kind)) notFound();

  const joined = id.map(decodeURIComponent).join("/");
  const source = getContentSource();

  const [content, docs] = await Promise.all([
    source.readDoc(project, kind, joined),
    source.listDocs(project),
  ]);
  if (content == null) notFound();

  /**
   * Where the doc's *own* folder is, so a relative `![](assets/x.png)` resolves.
   *
   * Derived from the doc rather than a kind→directory table: with the tree a
   * doc can live anywhere, and that table hard-coded three locations — every
   * image in a doc outside them would have 404'd.
   */
  const doc = docs.find((d) => d.kind === kind && d.id === joined);
  const dir = doc?.relPath.split("/").slice(0, -1).join("/") ?? "";
  const docDir = dir ? `__project__/${dir}` : "__project__";

  return (
    <article className="flex flex-col gap-4">
      <Markdown content={content} slug={project} docDir={docDir} />
    </article>
  );
}
