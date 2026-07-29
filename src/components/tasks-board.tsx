"use client";

import { DorGaps, TierBadge } from "@/components/badges";
import { TaskStatusControl } from "@/components/task-status-control";
import { readiness } from "@/lib/tasks/dor";
import type { Task, TaskStatus } from "@/lib/tasks/types";

/**
 * Column order, left to right: the path a task actually walks.
 *
 * `stretch` sits last because it is a planning label rather than a stage — a
 * stretch task is not "after done", it is outside the flow, and putting it
 * mid-board would imply a progression that does not exist.
 */
const COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: "todo", label: "To do" },
  { status: "in-progress", label: "In progress" },
  { status: "blocked", label: "Blocked" },
  { status: "done", label: "Done" },
  { status: "stretch", label: "Stretch" },
];

/**
 * The backlog as status columns.
 *
 * Answers "what is in flight", which the table cannot — a table sorted by id
 * scatters the three in-progress tasks among thirty. Read-only apart from the
 * same `TaskStatusControl` the table uses: moving a card by dragging is a write
 * path with optimistic state and is deliberately out of scope (backlog W3).
 */
export function TasksBoard({
  project,
  tasks,
  mayWrite,
}: {
  project: string;
  tasks: Task[];
  mayWrite: boolean;
}) {
  return (
    // Horizontal scroll rather than a wrap: five columns that reflow into two
    // rows stop reading as a board. The container scrolls, never the page —
    // `mobile.spec.ts` pins that no surface scrolls the viewport sideways.
    <div className="-mx-1 w-full min-w-0 overflow-x-auto px-1 pb-2">
      <div className="flex min-w-max gap-3" data-testid="task-board">
        {COLUMNS.map((column) => {
          const inColumn = tasks.filter((t) => t.status === column.status);
          return (
            <section
              key={column.status}
              aria-label={column.label}
              data-testid={`board-column-${column.status}`}
              className="flex w-72 shrink-0 flex-col gap-2"
            >
              <header className="flex items-center gap-2 px-1">
                <h2 className="text-sm font-medium">{column.label}</h2>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {inColumn.length}
                </span>
              </header>

              <div className="flex flex-col gap-2">
                {inColumn.length === 0 ? (
                  <p className="rounded-lg border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">
                    Nothing here
                  </p>
                ) : (
                  inColumn.map((task) => (
                    <article
                      key={task.id}
                      className="flex flex-col gap-2 rounded-lg border bg-card p-3 transition-colors hover:border-foreground/20"
                    >
                      {/* No status badge: the column already says the status,
                          and repeating it in every card is the noise the
                          neutral-variant change removed from the table. */}
                      <span className="font-mono text-xs text-muted-foreground">{task.id}</span>
                      <p className="text-sm font-medium break-words">{task.title}</p>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <TierBadge tier={task.autonomy} />
                        <Readiness task={task} />
                      </div>
                      {mayWrite && (
                        <TaskStatusControl
                          project={project}
                          taskId={task.id}
                          status={task.status}
                        />
                      )}
                    </article>
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function Readiness({ task }: { task: Task }) {
  if (task.status === "done") return null;
  const r = readiness(task);
  return r.ready ? (
    <span className="text-xs text-emerald-700 dark:text-emerald-400">ready</span>
  ) : (
    <DorGaps missing={r.missing} />
  );
}
