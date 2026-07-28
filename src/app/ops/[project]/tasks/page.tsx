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
        <div className="rounded-lg border">
          {/* Fixed layout + explicit widths: a real backlog has titles hundreds
              of characters long, and auto layout let one of them push Status
              and the status controls off the right edge. */}
          <Table className="table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">ID</TableHead>
                <TableHead>Title</TableHead>
                <TableHead className="w-24">Status</TableHead>
                <TableHead className="w-28">Tier</TableHead>
                <TableHead className="w-40">Readiness</TableHead>
                {mayWrite && <TableHead className="w-72">Move to</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {view.tasks.map((task) => {
                const r = readiness(task);
                return (
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
                      {task.status === "done" ? null : r.ready ? (
                        <span className="text-xs text-emerald-700 dark:text-emerald-400">
                          ready
                        </span>
                      ) : (
                        <DorGaps missing={r.missing} />
                      )}
                    </TableCell>
                    {mayWrite && (
                      <TableCell className="align-top">
                        <TaskStatusControl project={slug} taskId={task.id} status={task.status} />
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {mayWrite && <ProposedChanges writes={recordedWrites().filter((w) => w.slug === slug)} />}
    </div>
  );
}
