"use client";

import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { type ActionResult, changeTaskStatus } from "@/app/ops/[project]/actions";
import { WriteOutcomeNotice } from "@/components/write-outcome";
import type { TaskStatus } from "@/lib/tasks/types";

/** The statuses a human moves a task between; `stretch` is a planning label. */
const FLOW: TaskStatus[] = ["todo", "in-progress", "done", "blocked"];

/**
 * Move a task's status without git (US-4).
 *
 * The write is a proposal, not an edit applied locally and synced later — so
 * the control does not optimistically re-render the new status. It reports what
 * the transport actually did, and the task list re-reads from the repo.
 */
export function TaskStatusControl({
  project,
  taskId,
  status,
}: {
  project: string;
  taskId: string;
  status: TaskStatus;
}) {
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, startTransition] = useTransition();

  function move(next: TaskStatus) {
    if (next === status) return;
    startTransition(async () => setResult(await changeTaskStatus(project, taskId, next)));
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div
        className="flex w-max flex-wrap items-center gap-1"
        data-testid={`status-control-${taskId}`}
      >
        {pending && <Loader2 className="size-3 animate-spin text-muted-foreground" />}
        {FLOW.map((option) => (
          <button
            key={option}
            type="button"
            disabled={pending || option === status}
            onClick={() => move(option)}
            title={option === status ? `Already ${option}` : `Move to ${option}`}
            className={`rounded border px-1.5 py-0.5 text-[11px] ${
              option === status
                ? "border-border bg-muted text-muted-foreground"
                : "border-border hover:bg-muted"
            } disabled:cursor-default`}
          >
            {option}
          </button>
        ))}
      </div>
      {result && <WriteOutcomeNotice result={result} />}
    </div>
  );
}
