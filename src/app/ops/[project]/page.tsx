import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge, TierBadge } from "@/components/badges";
import type { DocKind } from "@/lib/content";
import { loadProject } from "@/lib/ops/load";
import { readiness } from "@/lib/tasks/dor";

export const dynamic = "force-dynamic";

const KIND_LABEL: Record<DocKind, string> = { adr: "ADRs", spec: "Specs", retro: "Retro" };

export default async function ProjectPage({ params }: { params: Promise<{ project: string }> }) {
  const { project } = await params;
  const view = await loadProject(project);
  if (!view) notFound();

  const kinds: DocKind[] = ["adr", "spec", "retro"];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href="/ops" className="text-sm text-muted-foreground hover:underline">
          ← all projects
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{view.name}</h1>
          <Link
            href={`/ops/${project}/triage`}
            className="inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 "
          >
            Triage an idea →
          </Link>
        </div>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Docs</h2>
        <div className="flex flex-col gap-4">
          {kinds.map((kind) => {
            const docs = view.docs.filter((d) => d.kind === kind);
            if (docs.length === 0) return null;
            return (
              <div key={kind}>
                <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {KIND_LABEL[kind]}
                </h3>
                <ul className="flex flex-col">
                  {docs.map((d) => (
                    <li key={d.id}>
                      <Link
                        href={`/ops/${project}/${d.kind}/${d.id}`}
                        className="text-sm hover:underline"
                      >
                        {d.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Tasks</h2>
        <ul className="divide-y divide-border rounded-lg border border-border ">
          {view.tasks.map((t) => {
            const r = readiness(t);
            return (
              <li key={t.id} className="flex flex-wrap items-center gap-2 p-3">
                <span className="font-mono text-xs text-muted-foreground">{t.id}</span>
                <span className="flex-1 text-sm">{t.title}</span>
                <StatusBadge status={t.status} />
                <TierBadge tier={t.autonomy} />
                {t.status !== "done" &&
                  (r.ready ? (
                    <span className="text-xs text-emerald-700 dark:text-emerald-400">ready</span>
                  ) : (
                    <span className="text-xs text-amber-700 dark:text-amber-400">
                      draft: {r.missing.join(", ")}
                    </span>
                  ))}
              </li>
            );
          })}
          {view.tasks.length === 0 && (
            <li className="p-3 text-sm text-muted-foreground">No parseable tasks in backlog.md.</li>
          )}
        </ul>
      </section>
    </div>
  );
}
