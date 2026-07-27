"use client";

import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { type ActionResult, captureTask } from "@/app/ops/[project]/actions";
import { WriteOutcomeNotice } from "@/components/write-outcome";
import { readiness } from "@/lib/tasks/dor";
import type { AutonomyTier, DorField, Task } from "@/lib/tasks/types";

const TIERS: AutonomyTier[] = ["supervised", "plan-gated", "dark", "trivial"];

const FIELD_LABEL: Record<DorField, string> = {
  intent: "Intent",
  autonomy: "Autonomy",
  touches: "Touches",
  mustNot: "Must NOT",
  oracle: "Oracle",
  evidence: "Evidence (≥2)",
  escalateIf: "Escalate if",
};

const parseList = (s: string) =>
  s
    .split(/[,\n·]/)
    .map((x) => x.trim())
    .filter(Boolean);

const inputCls =
  "w-full rounded-md border border-input bg-transparent px-2.5 py-1.5 text-sm placeholder:text-muted-foreground";

type Draft = {
  id: string;
  title: string;
  intent: string;
  autonomy: AutonomyTier | "";
  touches: string;
  mustNot: string;
  oracle: string;
  evidence: string;
  escalateIf: string;
};

const EMPTY: Draft = {
  id: "",
  title: "",
  intent: "",
  autonomy: "",
  touches: "",
  mustNot: "",
  oracle: "",
  evidence: "",
  escalateIf: "",
};

function toTask(project: string, d: Draft): Task {
  return {
    id: d.id.trim(),
    project,
    title: d.title.trim(),
    status: "todo",
    autonomy: d.autonomy || undefined,
    intent: d.intent,
    touches: parseList(d.touches),
    mustNot: parseList(d.mustNot),
    oracle: d.oracle,
    evidence: parseList(d.evidence).map((ref) => ({ kind: "doc", ref })),
    escalateIf: d.escalateIf,
  };
}

/**
 * Capture a task without touching git (US-3).
 *
 * The Definition of Ready is shown live rather than enforced on submit: a DRAFT
 * task is a legitimate thing to record — the backlog is full of them — but the
 * person capturing it should see exactly which fields are missing while they
 * still have the context to fill them in.
 */
export function TaskCapture({ project }: { project: string }) {
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const task = toTask(project, draft);
  const dor = readiness(task);
  const submittable = task.id.length > 0 && task.title.length > 0;

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  function submit() {
    if (!submittable) return;
    startTransition(async () => {
      const r = await captureTask(project, task);
      setResult(r);
      if (r.ok) setDraft(EMPTY);
    });
  }

  if (!open) {
    return (
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          data-testid="open-capture"
          className="self-start rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"
        >
          + Capture a task
        </button>
        {result && <WriteOutcomeNotice result={result} />}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-4" data-testid="capture">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Capture a task</h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-muted-foreground hover:underline"
        >
          Close
        </button>
      </div>

      <div className="grid gap-2 sm:grid-cols-[8rem_1fr]">
        <input
          className={inputCls}
          placeholder="ID (e.g. C1.3)"
          aria-label="Task ID"
          value={draft.id}
          onChange={(e) => set("id", e.target.value)}
        />
        <input
          className={inputCls}
          placeholder="Title"
          aria-label="Title"
          value={draft.title}
          onChange={(e) => set("title", e.target.value)}
        />
      </div>

      <textarea
        className={inputCls}
        rows={2}
        placeholder="Intent — what becomes true, and why now"
        aria-label="Intent"
        value={draft.intent}
        onChange={(e) => set("intent", e.target.value)}
      />

      <div className="flex flex-wrap gap-1.5">
        {TIERS.map((tier) => (
          <button
            key={tier}
            type="button"
            onClick={() => set("autonomy", draft.autonomy === tier ? "" : tier)}
            className={`rounded-md border px-2.5 py-1 text-xs ${
              draft.autonomy === tier
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border hover:bg-muted"
            }`}
          >
            {tier}
          </button>
        ))}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <input
          className={inputCls}
          placeholder="Touches — comma separated"
          aria-label="Touches"
          value={draft.touches}
          onChange={(e) => set("touches", e.target.value)}
        />
        <input
          className={inputCls}
          placeholder="Must NOT — comma separated"
          aria-label="Must NOT"
          value={draft.mustNot}
          onChange={(e) => set("mustNot", e.target.value)}
        />
      </div>

      <input
        className={inputCls}
        placeholder="Oracle — how 'done' is verified"
        aria-label="Oracle"
        value={draft.oracle}
        onChange={(e) => set("oracle", e.target.value)}
      />
      <input
        className={inputCls}
        placeholder="Evidence — ≥2 pointable proofs, comma separated"
        aria-label="Evidence"
        value={draft.evidence}
        onChange={(e) => set("evidence", e.target.value)}
      />
      <input
        className={inputCls}
        placeholder="Escalate if — when to stop and ask"
        aria-label="Escalate if"
        value={draft.escalateIf}
        onChange={(e) => set("escalateIf", e.target.value)}
      />

      <div className="flex flex-wrap items-center gap-2" data-testid="capture-dor">
        {dor.ready ? (
          <span className="text-sm text-emerald-700 dark:text-emerald-400">
            READY — every Definition-of-Ready field is present.
          </span>
        ) : (
          <span className="text-sm text-amber-700 dark:text-amber-400">
            DRAFT — still missing: {dor.missing.map((f) => FIELD_LABEL[f]).join(", ")}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={!submittable || pending}
          data-testid="submit-capture"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {pending && <Loader2 className="size-3.5 animate-spin" />}
          Add to backlog
        </button>
        <span className="text-xs text-muted-foreground">
          Writes to the repo's backlog.md — you never touch git.
        </span>
      </div>

      {result && <WriteOutcomeNotice result={result} />}
    </div>
  );
}
