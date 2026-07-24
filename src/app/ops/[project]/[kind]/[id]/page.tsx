import Link from "next/link";
import { notFound } from "next/navigation";
import { Markdown } from "@/components/markdown";
import type { DocKind } from "@/lib/content";
import { getContentSource } from "@/lib/content";

export const dynamic = "force-dynamic";

const DOC_DIR: Record<DocKind, string> = {
  adr: "__project__/docs/decisions",
  spec: "__project__/specs",
  retro: "__project__/docs",
};

function isDocKind(k: string): k is DocKind {
  return k === "adr" || k === "spec" || k === "retro";
}

export default async function DocPage({
  params,
}: {
  params: Promise<{ project: string; kind: string; id: string }>;
}) {
  const { project, kind, id } = await params;
  if (!isDocKind(kind)) notFound();

  const content = await getContentSource().readDoc(project, kind, id);
  if (content == null) notFound();

  return (
    <article className="flex flex-col gap-4">
      <Link href={`/ops/${project}`} className="text-sm text-neutral-500 hover:underline">
        ← {project}
      </Link>
      <Markdown content={content} slug={project} docDir={DOC_DIR[kind]} />
    </article>
  );
}
