"use client";

import { LayoutGrid, Rows3 } from "lucide-react";
import { useEffect, useState } from "react";

import { TasksBoard } from "@/components/tasks-board";
import { TasksTable } from "@/components/tasks-table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { readiness } from "@/lib/tasks/dor";
import type { AutonomyTier, Task, TaskStatus } from "@/lib/tasks/types";

const STATUSES: TaskStatus[] = ["todo", "in-progress", "done", "blocked", "stretch"];
const TIERS: AutonomyTier[] = ["supervised", "plan-gated", "dark", "trivial"];

type View = "table" | "board";

const STORAGE_KEY = "gw:tasks-view";
const isView = (v: string | null): v is View => v === "table" || v === "board";

/**
 * The backlog, in whichever shape answers the question you have.
 *
 * A table answers "what is the state of everything"; a status-column board
 * answers "what is in flight" — the same tasks, and the backlog is genuinely
 * worked both ways. The filter row lives here rather than in either renderer so
 * the two cannot drift into filtering differently, and switching view keeps
 * whatever you had filtered.
 *
 * Filtering is client-side over the already-loaded tasks: a backlog is tens of
 * rows, so a round-trip per filter change would buy nothing and cost the
 * interaction.
 */
export function TasksView({
  project,
  tasks,
  mayWrite,
}: {
  project: string;
  tasks: Task[];
  mayWrite: boolean;
}) {
  const [status, setStatus] = useState("all");
  const [tier, setTier] = useState("all");
  const [readyOnly, setReadyOnly] = useState(false);
  const [blockedOnly, setBlockedOnly] = useState(false);

  /**
   * Start on the table and adopt the stored choice after mount.
   *
   * Reading localStorage during render would make the server's HTML and the
   * client's first paint disagree for anyone whose stored view is `board` —
   * a hydration mismatch. One frame of table is the cost of not having one.
   */
  const [view, setView] = useState<View>("table");
  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isView(stored)) setView(stored);
  }, []);

  const chooseView = (next: string) => {
    if (!isView(next)) return;
    setView(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  };

  const filtered = tasks.filter((t) => {
    if (status !== "all" && t.status !== status) return false;
    if (tier !== "all" && (t.autonomy ?? "") !== tier) return false;
    if (readyOnly && !readiness(t).ready) return false;
    if (blockedOnly && t.status !== "blocked") return false;
    return true;
  });

  return (
    // `min-w-0`: the board's `min-w-max` track would otherwise widen this
    // column to the full board width, pushing the `ml-auto` view toggle off
    // the right of the viewport instead of scrolling inside the board.
    <div className="flex min-w-0 flex-col gap-3">
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

        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-muted-foreground tabular-nums">
            {filtered.length} of {tasks.length}
          </span>
          <Tabs value={view} onValueChange={chooseView}>
            <TabsList aria-label="View">
              <TabsTrigger value="table" data-testid="view-table">
                <Rows3 aria-hidden />
                Table
              </TabsTrigger>
              <TabsTrigger value="board" data-testid="view-board">
                <LayoutGrid aria-hidden />
                Board
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {view === "board" ? (
        <TasksBoard project={project} tasks={filtered} mayWrite={mayWrite} />
      ) : (
        <TasksTable project={project} tasks={filtered} mayWrite={mayWrite} />
      )}
    </div>
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
