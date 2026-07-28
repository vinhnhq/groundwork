import { notFound } from "next/navigation";
import { DorGaps, StatusBadge, TierBadge } from "@/components/badges";
import { ProposedChanges } from "@/components/proposed-changes";
import { TaskCapture } from "@/components/task-capture";
import { TaskStatusControl } from "@/components/task-status-control";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/auth/roles";
import { recordedWrites } from "@/lib/content/writers";
import { loadProject } from "@/lib/ops/load";
import { getWriter } from "@/lib/ops/write";
import { readiness } from "@/lib/tasks/dor";
import type { Task } from "@/lib/tasks/types";

export const dynamic = "force-dynamic";

function Readiness({ task }: { task: Task }) {
  if (task.status === "done") return null;
  const r = readiness(task);
  return r.ready ? (
    <span className="text-xs text-emerald-700 dark:text-emerald-400">ready</span>
  ) : (
    <DorGaps missing={r.missing} />
  );
}

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
        <>
          {/* Phone: one card per task. A six-column table at 390px is either an
              unreadable squeeze or a sideways scroll that hides the status
              controls — neither is a backlog you would actually work from. */}
          <ul className="flex flex-col gap-2 md:hidden" data-testid="task-cards">
            {view.tasks.map((task) => (
              <li key={task.id} className="flex flex-col gap-2 rounded-lg border p-3">
                <div className="flex items-start gap-2">
                  <span className="font-mono text-xs text-muted-foreground">{task.id}</span>
                  <span className="flex-1 text-sm">{task.title}</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <StatusBadge status={task.status} />
                  <TierBadge tier={task.autonomy} />
                  <Readiness task={task} />
                </div>
                {mayWrite && (
                  <TaskStatusControl project={slug} taskId={task.id} status={task.status} />
                )}
              </li>
            ))}
          </ul>

          {/* Desktop: the same data as a scannable table. */}
          <div className="hidden rounded-lg border md:block">
            {/* Fixed layout + explicit widths: a real backlog has titles hundreds
                of characters long, and auto layout let one of them push Status
                and the status control off the right edge. */}
            <Table className="table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">ID</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead className="w-24">Status</TableHead>
                  <TableHead className="w-28">Tier</TableHead>
                  <TableHead className="w-40">Readiness</TableHead>
                  {mayWrite && <TableHead className="w-40">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {view.tasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell className="align-top font-mono text-xs text-muted-foreground">
                      {task.id}
                    </TableCell>
                    <TableCell className="align-top text-sm break-words whitespace-normal">
                      {task.title}
                    </TableCell>
                    <TableCell className="align-top">
                      <StatusBadge status={task.status} />
                    </TableCell>
                    <TableCell className="align-top">
                      <TierBadge tier={task.autonomy} />
                    </TableCell>
                    <TableCell className="align-top">
                      <Readiness task={task} />
                    </TableCell>
                    {mayWrite && (
                      <TableCell className="align-top">
                        <TaskStatusControl project={slug} taskId={task.id} status={task.status} />
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {mayWrite && <ProposedChanges writes={recordedWrites().filter((w) => w.slug === slug)} />}
    </div>
  );
}
