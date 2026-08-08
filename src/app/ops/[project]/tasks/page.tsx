import { notFound } from "next/navigation";

import { ProposedChanges } from "@/components/proposed-changes";
import { TaskCapture } from "@/components/task-capture";
import { TasksView } from "@/components/tasks-view";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/auth/roles";
import { recordedWrites } from "@/lib/content/writers";
import { loadProject } from "@/lib/ops/load";
import { getWriter } from "@/lib/ops/write";

export const dynamic = "force-dynamic";

export default async function ProjectTasks({ params }: { params: Promise<{ project: string }> }) {
  const { project: slug } = await params;
  const [view, session] = await Promise.all([loadProject(slug), getSession()]);
  if (!view) notFound();

  const mayWrite = can(session?.user.role ?? "client", "tasks.write");
  const writer = getWriter();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Tasks</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Parsed from <code>__project__/tasks/backlog.md</code>. READY means every
            Definition-of-Ready field is present.
          </p>
          {view.skipped.length > 0 && (
            <p
              data-testid="skipped-lines"
              className="mt-1 text-xs text-amber-700 dark:text-amber-400"
              title={view.skipped.map((s) => `line ${s.line}: ${s.text}`).join("\n")}
            >
              {view.skipped.length} task-like line(s) did not parse — off the backlog grammar (hover
              for which).
            </p>
          )}
        </div>
        {mayWrite && (
          <span className="text-xs text-muted-foreground">
            Write-back: <span className="font-medium">{writer.mode}</span>
            {writer.mocked && " (mocked)"}
          </span>
        )}
      </div>

      {mayWrite && <TaskCapture project={slug} />}

      {view.tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground">No parseable tasks in backlog.md.</p>
      ) : (
        <TasksView project={slug} tasks={view.tasks} mayWrite={mayWrite} />
      )}

      {mayWrite && <ProposedChanges writes={recordedWrites().filter((w) => w.slug === slug)} />}
    </div>
  );
}
