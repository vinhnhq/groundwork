"use client";

import { useState } from "react";
import { DorGaps, StatusBadge, TierBadge } from "@/components/badges";
import { TaskStatusControl } from "@/components/task-status-control";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { readiness } from "@/lib/tasks/dor";
import type { AutonomyTier, Task, TaskStatus } from "@/lib/tasks/types";

const STATUSES: TaskStatus[] = ["todo", "in-progress", "done", "blocked", "stretch"];
const TIERS: AutonomyTier[] = ["supervised", "plan-gated", "dark", "trivial"];

function Readiness({ task }: { task: Task }) {
  if (task.status === "done") return null;
  const r = readiness(task);
  return r.ready ? (
    <span className="text-xs text-emerald-700 dark:text-emerald-400">ready</span>
  ) : (
    <DorGaps missing={r.missing} />
  );
}

/**
 * The backlog, as a scan surface.
 *
 * Filtering is client-side over the already-loaded tasks — a backlog is tens of
 * rows, not thousands, so a round-trip per filter change would buy nothing and
 * cost the interaction.
 */
export function TasksTable({
  project,
  tasks,
  mayWrite,
}: {
  project: string;
  tasks: Task[];
  mayWrite: boolean;
}) {
  const [status, setStatus] = useState<string>("all");
  const [tier, setTier] = useState<string>("all");
  const [readyOnly, setReadyOnly] = useState(false);
  const [blockedOnly, setBlockedOnly] = useState(false);

  const filtered = tasks.filter((t) => {
    if (status !== "all" && t.status !== status) return false;
    if (tier !== "all" && (t.autonomy ?? "") !== tier) return false;
    if (readyOnly && !readiness(t).ready) return false;
    if (blockedOnly && t.status !== "blocked") return false;
    return true;
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <FilterSelect
          label="Status"
          value={status}
          onChange={setStatus}
          options={[
            { value: "all", label: "All statuses" },
            ...STATUSES.map((s) => ({ value: s, label: s })),
          ]}
        />
        <FilterSelect
          label="Tier"
          value={tier}
          onChange={setTier}
          options={[
            { value: "all", label: "All tiers" },
            ...TIERS.map((t) => ({ value: t, label: t })),
          ]}
        />
        <Button
          type="button"
          size="sm"
          variant={readyOnly ? "default" : "outline"}
          aria-pressed={readyOnly}
          onClick={() => setReadyOnly((v) => !v)}
        >
          READY only
        </Button>
        <Button
          type="button"
          size="sm"
          variant={blockedOnly ? "default" : "outline"}
          aria-pressed={blockedOnly}
          onClick={() => setBlockedOnly((v) => !v)}
        >
          Blocked
        </Button>

        <span className="ml-auto text-xs text-muted-foreground tabular-nums">
          {filtered.length} of {tasks.length}
        </span>
      </div>

      {/* Phone: one card per task. A six-column table at 390px is either an
          unreadable squeeze or a sideways scroll that hides the status
          controls — neither is a backlog you would actually work from. */}
      <ul className="flex flex-col gap-2 md:hidden" data-testid="task-cards">
        {filtered.map((task) => (
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
              <TaskStatusControl project={project} taskId={task.id} status={task.status} />
            )}
          </li>
        ))}
      </ul>

      {/* Desktop: the same data as a scannable table. No card wrapper and no
          outer border — the header rule and the row hairlines carry the
          structure, which is what stops a dense table reading as a box of
          boxes. Fixed layout with explicit widths because a real backlog has
          titles hundreds of characters long, and auto layout let one of them
          push Status and the status control off the right edge. */}
      <div className="hidden md:block">
        <Table className="table-fixed">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-20">ID</TableHead>
              <TableHead>Title</TableHead>
              <TableHead className="w-24">Status</TableHead>
              <TableHead className="w-28">Tier</TableHead>
              <TableHead className="w-40">Readiness</TableHead>
              {mayWrite && <TableHead className="w-40 text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={mayWrite ? 6 : 5}
                  className="py-8 text-center text-sm text-muted-foreground"
                >
                  No tasks match these filters.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((task) => (
                <TaskRow key={task.id} task={task} project={project} mayWrite={mayWrite} />
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function TaskRow({ task, project, mayWrite }: { task: Task; project: string; mayWrite: boolean }) {
  // Not an interactive row: there is no task detail view to open, and a
  // focusable row with a pointer cursor that does nothing is worse than a
  // plain one. Rows here get hover feedback only.
  return (
    <TableRow className="align-top">
      <TableCell className="font-mono text-xs text-muted-foreground">{task.id}</TableCell>
      <TableCell className="font-medium break-words whitespace-normal">{task.title}</TableCell>
      <TableCell>
        <StatusBadge status={task.status} />
      </TableCell>
      <TableCell>
        <TierBadge tier={task.autonomy} />
      </TableCell>
      <TableCell>
        <Readiness task={task} />
      </TableCell>
      {mayWrite && (
        <TableCell className="text-right">
          <TaskStatusControl project={project} taskId={task.id} status={task.status} />
        </TableCell>
      )}
    </TableRow>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger size="sm" className="w-fit gap-1.5" aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
