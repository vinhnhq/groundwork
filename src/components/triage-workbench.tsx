"use client";

import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { acceptDraft, analyzeIdea } from "@/app/ops/[project]/triage/actions";
import { readiness } from "@/lib/tasks/dor";
import type { AutonomyTier, Task } from "@/lib/tasks/types";
import type { DraftTicket, TriageKind, TriageResult } from "@/lib/triage/types";

const KIND_STYLE: Record<TriageKind, string> = {
  duplicate: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  overlaps: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  "needs-spike": "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300",
  "new-task": "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
};

const TIERS: AutonomyTier[] = ["supervised", "plan-gated", "dark", "trivial"];

const csv = (arr: string[]) => arr.join(", ");
const parseCsv = (s: string) =>
  s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

function toTask(project: string, d: DraftTicket): Task {
  return { ...d, project, status: "todo" };
}

const inputCls =
  "w-full rounded-md border border-neutral-300 bg-transparent px-2.5 py-1.5 text-sm dark:border-neutral-700";

export function TriageWorkbench({ project }: { project: string }) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<TriageResult | null>(null);
  const [draft, setDraft] = useState<DraftTicket | null>(null);
  const [accepted, setAccepted] = useState<{ block: string; count: number } | null>(null);
  const [pending, startTransition] = useTransition();

  const dor = draft ? readiness(toTask(project, draft)) : null;

  const set = <K extends keyof DraftTicket>(key: K, value: DraftTicket[K]) =>
    setDraft((d) => (d ? { ...d, [key]: value } : d));

  function analyze() {
    if (!text.trim()) return;
    startTransition(async () => {
      const r = await analyzeIdea(project, text);
      setResult(r);
      setDraft(r.draft);
      setAccepted(null);
    });
  }

  function accept() {
    if (!draft || !dor?.ready) return;
    startTransition(async () => setAccepted(await acceptDraft(project, draft)));
  }

  function dismiss() {
    setResult(null);
    setDraft(null);
    setAccepted(null);
    setText("");
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <textarea
          aria-label="Client idea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          placeholder="e.g. The client wants a monthly revenue export as a spreadsheet…"
          className={inputCls}
        />
        <div>
          <button
            type="button"
            onClick={analyze}
            disabled={pending || !text.trim()}
            aria-busy={pending}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-neutral-900 px-4 text-sm font-medium text-white disabled:opacity-60 dark:bg-white dark:text-neutral-900"
          >
            {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
            Analyze against docs
          </button>
        </div>
      </div>

      {result && draft && (
        <div className="flex flex-col gap-5 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
          <div className="flex flex-col gap-2">
            <span
              className={`inline-flex w-fit items-center rounded-md px-2 py-0.5 text-xs font-medium ${KIND_STYLE[result.kind]}`}
            >
              {result.kind}
            </span>
            <p className="text-sm">{result.message}</p>
            {result.citations.length > 0 && (
              <p className="text-xs text-neutral-500">
                Grounded in: {result.citations.map((c) => c.label).join(" · ")}
              </p>
            )}
          </div>

          <div className="grid gap-3">
            <label className="flex flex-col gap-1 text-xs text-neutral-500">
              Title
              <input
                className={inputCls}
                value={draft.title}
                onChange={(e) => set("title", e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-neutral-500">
              Autonomy
              <select
                className={inputCls}
                value={draft.autonomy ?? ""}
                onChange={(e) => set("autonomy", (e.target.value || undefined) as AutonomyTier)}
              >
                <option value="">— none —</option>
                {TIERS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-neutral-500">
              Intent
              <input
                className={inputCls}
                value={draft.intent ?? ""}
                onChange={(e) => set("intent", e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-neutral-500">
              Touches (comma-separated)
              <input
                className={inputCls}
                value={csv(draft.touches)}
                onChange={(e) => set("touches", parseCsv(e.target.value))}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-neutral-500">
              Must NOT (comma-separated)
              <input
                className={inputCls}
                value={csv(draft.mustNot)}
                onChange={(e) => set("mustNot", parseCsv(e.target.value))}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-neutral-500">
              Oracle (how "done" is verified)
              <input
                className={inputCls}
                value={draft.oracle ?? ""}
                onChange={(e) => set("oracle", e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-neutral-500">
              Evidence (comma-separated, ≥2)
              <input
                className={inputCls}
                value={csv(draft.evidence.map((ev) => ev.ref))}
                onChange={(e) =>
                  set(
                    "evidence",
                    parseCsv(e.target.value).map((ref) => ({ kind: "doc", ref })),
                  )
                }
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-neutral-500">
              Escalate if
              <input
                className={inputCls}
                value={draft.escalateIf ?? ""}
                onChange={(e) => set("escalateIf", e.target.value)}
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-3" data-testid="dor-status">
            {dor?.ready ? (
              <span className="rounded-md bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                READY
              </span>
            ) : (
              <span className="rounded-md bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                missing: {dor?.missing.join(", ")}
              </span>
            )}
            <button
              type="button"
              onClick={accept}
              disabled={!dor?.ready || pending}
              className="inline-flex h-9 items-center rounded-md bg-emerald-600 px-3 text-sm font-medium text-white disabled:opacity-50"
            >
              Accept → backlog
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="inline-flex h-9 items-center rounded-md border border-neutral-300 px-3 text-sm dark:border-neutral-700"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {accepted && (
        <div className="flex flex-col gap-2 rounded-lg border border-emerald-300 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/40">
          <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
            Would append to {project}/__project__/tasks/backlog.md
          </p>
          <pre className="overflow-x-auto rounded bg-white/70 p-3 text-xs dark:bg-black/30">
            {accepted.block}
          </pre>
          <p className="text-xs text-emerald-700 dark:text-emerald-400">
            Mock write-back (in-memory). Real version commits/opens a PR against the repo.
          </p>
        </div>
      )}
    </div>
  );
}
