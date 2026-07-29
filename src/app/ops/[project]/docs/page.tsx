import { FileText } from "lucide-react";
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
          Every Markdown file under <code>__project__/</code>, in the repo's own folder structure —{" "}
          {view.docs.length} document{view.docs.length === 1 ? "" : "s"}, read straight from the
          source of truth.
        </p>
      </div>

      {view.docs.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nothing under <code>__project__/</code> yet.
        </p>
      ) : (
        <>
          {/* Phone and tablet: no persistent sidebar to navigate from, so the
              tree is the page. */}
          <div className="md:hidden">
            <DocTree nodes={tree} openPaths={allFolderPaths(tree)} />
          </div>

          {/* Desktop: the sidebar holds the tree, and this pane is where the
              document lands. An empty state rather than a second copy of the
              tree — two trees on one screen is a choice the reader has to make
              for no reason. */}
          <div className="hidden flex-1 items-center justify-center rounded-lg border border-dashed py-16 md:flex">
            <div className="flex flex-col items-center gap-2 text-center">
              <FileText className="size-6 text-muted-foreground" aria-hidden />
              <p className="text-sm font-medium">Pick a document</p>
              <p className="max-w-xs text-sm text-muted-foreground">
                The folder tree in the sidebar mirrors <code>__project__/</code>. Choose a file and
                it opens here.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
