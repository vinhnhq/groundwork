import Link from "next/link";
import { notFound } from "next/navigation";
import { DorGaps, StatusBadge, TierBadge } from "@/components/badges";
import { CopyContext } from "@/components/copy-context";
import { ProposedChanges } from "@/components/proposed-changes";
import { TaskCapture } from "@/components/task-capture";
import { TaskStatusControl } from "@/components/task-status-control";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/auth/roles";
import type { DocKind } from "@/lib/content";
import { recordedWrites } from "@/lib/content/writers";
import { loadProjectBrain } from "@/lib/ops/brain";
import { loadProject } from "@/lib/ops/load";
import { getWriter } from "@/lib/ops/write";
import { readiness } from "@/lib/tasks/dor";

export const dynamic = "force-dynamic";

const KIND_LABEL: Record<DocKind, string> = { adr: "ADRs", spec: "Specs", retro: "Retro" };

export default async function ProjectPage({ params }: { params: Promise<{ project: string }> }) {
  const { project } = await params;
  const [view, brain, session] = await Promise.all([
    loadProject(project),
    loadProjectBrain(project),
    getSession(),
  ]);
  if (!view) notFound();

  const kinds: DocKind[] = ["adr", "spec", "retro"];
  const writer = getWriter();

  // Affordances follow capability (R1). Hiding them is courtesy, not security —
  // the proxy gates the routes and the actions re-check before writing.
  const role = session?.user.role ?? "client";
  const mayWrite = can(role, "tasks.write");
  const mayGround = can(role, "grounding.read");
  const mayAgent = can(role, "agent.run");

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href="/ops" className="text-sm text-muted-foreground hover:underline">
          ← all projects
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{view.name}</h1>
          {mayAgent && (
            <Link
              href={`/ops/${project}/triage`}
              className="inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 "
            >
              Triage an idea →
            </Link>
          )}
        </div>
      </div>

      {brain && mayGround && (
        <section data-testid="grounding" className="rounded-lg border border-border p-4">
          <div className="mb-1 flex flex-wrap items-baseline gap-2">
            <h2 className="text-lg font-semibold">Grounding</h2>
            <span className="text-xs text-muted-foreground">
              {brain.decisions.length} locked decision(s) · {brain.constraints.length} constraint(s)
              · {brain.ready.length} ready task(s)
            </span>
          </div>
          <p className="mb-3 text-sm text-muted-foreground">
            One distilled digest of this project's current truth. Paste it into any agent — GPT or
            Claude — so it reasons from the same decisions you did.
          </p>

          <CopyContext text={brain.text} exportHref={`/ops/${project}/context.md`} />

          {brain.omitted.length > 0 && (
            <ul className="mt-3 flex flex-col gap-0.5 text-xs text-amber-700 dark:text-amber-400">
              {brain.omitted.map((note) => (
                <li key={note}>⚠ {note}</li>
              ))}
            </ul>
          )}

          <details className="mt-3">
            <summary className="cursor-pointer text-xs text-muted-foreground hover:underline">
              Preview the digest
            </summary>
            <pre className="mt-2 max-h-96 overflow-auto rounded-md bg-muted/40 p-3 text-xs whitespace-pre-wrap">
              {brain.text}
            </pre>
          </details>
        </section>
      )}

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

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold">Tasks</h2>
          {mayWrite && (
            <span className="text-xs text-muted-foreground">
              Write-back: <span className="font-medium">{writer.mode}</span>
              {writer.mocked && " (mocked)"} — {writer.describe}
            </span>
          )}
        </div>

        {mayWrite && <TaskCapture project={project} />}

        <ul className="divide-y divide-border rounded-lg border border-border ">
          {view.tasks.map((t) => {
            const r = readiness(t);
            return (
              <li key={t.id} className="flex flex-col gap-2 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">{t.id}</span>
                  <span className="flex-1 text-sm">{t.title}</span>
                  <StatusBadge status={t.status} />
                  <TierBadge tier={t.autonomy} />
                  {t.status !== "done" &&
                    (r.ready ? (
                      <span className="text-xs text-emerald-700 dark:text-emerald-400">ready</span>
                    ) : (
                      <DorGaps missing={r.missing} />
                    ))}
                </div>
                {mayWrite && (
                  <TaskStatusControl project={project} taskId={t.id} status={t.status} />
                )}
              </li>
            );
          })}
          {view.tasks.length === 0 && (
            <li className="p-3 text-sm text-muted-foreground">No parseable tasks in backlog.md.</li>
          )}
        </ul>
      </section>

      {mayWrite && <ProposedChanges writes={recordedWrites().filter((w) => w.slug === project)} />}
    </div>
  );
}
