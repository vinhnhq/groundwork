import { notFound } from "next/navigation";
import { requireCapability } from "@/app/ops/guard";
import { TriageWorkbench } from "@/components/triage-workbench";
import { getContentSource } from "@/lib/content";

export const dynamic = "force-dynamic";

export default async function TriagePage({ params }: { params: Promise<{ project: string }> }) {
  // The triage agent spends tokens and proposes work — engineer-only. Same
  // reason as /ops/integrations: the proxy's cookie cache expires, this does not.
  await requireCapability("agent.run");

  const { project } = await params;
  const p = await getContentSource().getProject(project);
  if (!p) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div>
        {/* No back link: the sidebar already says which project you are in and
            the header carries the breadcrumb, so this was a third copy of the
            same fact costing a row of vertical space above the fold. */}
        <h1 className="text-2xl font-semibold tracking-tight">Triage an idea</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Paste a client idea. The agent checks it against this project's docs, then drafts a
          Definition-of-Ready ticket — you ground it and dispose.
        </p>
      </div>
      <TriageWorkbench project={project} />
    </div>
  );
}
