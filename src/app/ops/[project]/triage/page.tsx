import { notFound } from "next/navigation";
import { requireCapability } from "@/app/ops/guard";
import { TriageWorkbench } from "@/components/triage-workbench";
import { getContentSource } from "@/lib/content";
import { buildDocTree } from "@/lib/content/doc-tree";

export const dynamic = "force-dynamic";

export default async function TriagePage({ params }: { params: Promise<{ project: string }> }) {
  // The triage agent spends tokens and proposes work — engineer-only. Same
  // reason as /ops/integrations: the proxy's cookie cache expires, this does not.
  await requireCapability("agent.run");

  const { project } = await params;
  const source = getContentSource();
  const [p, docs] = await Promise.all([source.getProject(project), source.listDocs(project)]);
  if (!p) notFound();

  return (
    /**
     * A centred reading column, not the full width.
     *
     * A conversation is a column of prose; stretched across a wide monitor the
     * eye has to travel the whole way back for each line, and the composer's
     * controls end up a hand-span apart. `max-w-3xl` (48rem ≈ 768px) is about a
     * tablet's width, so on a tablet this fills the viewport and the surface is
     * just the thread and its input.
     *
     * No page heading: it moved into the composer's own description, since the
     * input is the surface rather than something a heading introduces.
     */
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <TriageWorkbench
        project={project}
        docs={docs.map((d) => ({ id: d.id, kind: d.kind, title: d.title, relPath: d.relPath }))}
        docTree={buildDocTree(docs, project)}
      />
    </div>
  );
}
