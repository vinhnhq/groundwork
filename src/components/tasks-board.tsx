"use client";

import { DorGaps, TierBadge } from "@/components/badges";
import { Reveal } from "@/components/reveal";
import { staggerDelay } from "@/components/stagger";
import { TaskStatusControl } from "@/components/task-status-control";
import { Card, CardContent } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader } from "@/components/ui/empty";
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
        {COLUMNS.map((column, index) => {
          const inColumn = tasks.filter((t) => t.status === column.status);
          return (
            // The wrapper is the flex item now, so it carries the column's
            // width and no-shrink — otherwise the track collapses.
            <Reveal key={column.status} delay={staggerDelay(index)} className="w-72 shrink-0">
              <section
                aria-label={column.label}
                data-testid={`board-column-${column.status}`}
                className="flex flex-col gap-2"
              >
                <header className="flex items-center gap-2 px-1">
                  <h2 className="text-sm font-medium">{column.label}</h2>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {inColumn.length}
                  </span>
                </header>

                <div className="flex flex-col gap-2">
                  {inColumn.length === 0 ? (
                    <Empty className="border border-dashed py-6">
                      <EmptyHeader>
                        <EmptyDescription>Nothing here</EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  ) : (
                    inColumn.map((task) => (
                      <Card
                        key={task.id}
                        size="sm"
                        className="transition-shadow hover:ring-foreground/20"
                      >
                        <CardContent className="flex flex-col gap-2">
                          {/* No status badge: the column already says the status,
                              and repeating it in every card is the noise the
                              neutral-variant change removed from the table. */}
                          <span className="font-mono text-xs text-muted-foreground">
                            {task.id}
                          </span>
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
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </section>
            </Reveal>
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
