import Link from "next/link";
import { notFound } from "next/navigation";
import { TriageWorkbench } from "@/components/triage-workbench";
import { getContentSource } from "@/lib/content";

export const dynamic = "force-dynamic";

export default async function TriagePage({ params }: { params: Promise<{ project: string }> }) {
  const { project } = await params;
  const p = await getContentSource().getProject(project);
  if (!p) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href={`/ops/${project}`} className="text-sm text-muted-foreground hover:underline">
          ← {p.meta.name}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Triage an idea</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Paste a client idea. The agent checks it against this project's docs, then drafts a
          Definition-of-Ready ticket — you ground it and dispose.
        </p>
      </div>
      <TriageWorkbench project={project} />
    </div>
  );
}
