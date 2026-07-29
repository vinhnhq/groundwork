import { notFound } from "next/navigation";
import { DocTree } from "@/components/doc-tree";
import { allFolderPaths, buildDocTree } from "@/lib/content/doc-tree";
import { loadProject } from "@/lib/ops/load";

export const dynamic = "force-dynamic";

export default async function ProjectDocs({ params }: { params: Promise<{ project: string }> }) {
  const { project: slug } = await params;
  const view = await loadProject(slug);
  if (!view) notFound();

  const tree = buildDocTree(view.docs, slug);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Docs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every Markdown file under <code>__project__/</code>, in the repo's own folder structure.
          Read straight from the source of truth — {view.docs.length} document
          {view.docs.length === 1 ? "" : "s"}.
        </p>
      </div>

      {view.docs.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nothing under <code>__project__/</code> yet.
        </p>
      ) : (
        <DocTree nodes={tree} openPaths={allFolderPaths(tree)} />
      )}
    </div>
  );
}
