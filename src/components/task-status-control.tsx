"use client";

import { Check, ChevronDown, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";

import { type ActionResult, changeTaskStatus } from "@/app/ops/[project]/actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { WriteOutcomeNotice } from "@/components/write-outcome";
import type { TaskStatus } from "@/lib/tasks/types";

/** The statuses a human moves a task between; `stretch` is a planning label. */
const FLOW: TaskStatus[] = ["todo", "in-progress", "done", "blocked"];

/**
 * Move a task's status without git (US-4).
 *
 * One trigger rather than a row of four buttons: at four states per row it was
 * wider than the title column on a real backlog, and on a phone it wrapped into
 * a two-line block of near-identical targets.
 *
 * The write is a proposal, so this does not optimistically re-render the new
 * status. It reports what the transport actually did, and the list re-reads
 * from the repo.
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
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            data-testid={`status-control-${taskId}`}
            className="w-full justify-between sm:w-36"
          >
            <span className="truncate">{pending ? "Moving…" : "Move to"}</span>
            {pending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <ChevronDown className="size-3.5 opacity-60" />
            )}
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
            {taskId} is {status}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {FLOW.map((option) => (
            <DropdownMenuItem
              key={option}
              disabled={option === status}
              onSelect={() => move(option)}
            >
              {option === status && <Check className="size-3.5" />}
              <span className={option === status ? "" : "ml-[1.125rem]"}>{option}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {result && <WriteOutcomeNotice result={result} />}
    </div>
  );
}
