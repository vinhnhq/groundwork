"use client";

import { Loader2, Plus } from "lucide-react";
import { useState, useTransition } from "react";
import { type ActionResult, captureTask } from "@/app/ops/[project]/actions";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { WriteOutcomeNotice } from "@/components/write-outcome";
import { readiness } from "@/lib/tasks/dor";
import type { AutonomyTier, DorField, Task } from "@/lib/tasks/types";
import { cn } from "@/lib/utils";

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
 * Capture a task without touching git (US-3), in a drawer.
 *
 * A drawer rather than an inline form: the form is nine fields, and inlining it
 * pushed the task table — the thing you are capturing *against* — off the
 * screen. On a phone it becomes a full-height sheet, which is the only way nine
 * fields are usable there.
 *
 * The Definition of Ready is shown live rather than enforced on submit. A DRAFT
 * task is a legitimate thing to record — the backlog is full of them — but the
 * person capturing it should see which fields are missing while they still have
 * the context to fill them in.
 */
export function TaskCapture({ project }: { project: string }) {
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

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
      if (r.ok) {
        setDraft(EMPTY);
        setOpen(false);
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          <Button variant="outline" size="sm" data-testid="open-capture" className="w-fit">
            <Plus className="size-4" />
            Capture a task
          </Button>
        </DrawerTrigger>

        <DrawerContent data-testid="capture" className="max-h-[90svh]">
          <div className="mx-auto flex min-h-0 w-full max-w-2xl flex-col">
            <DrawerHeader className="text-left">
              <DrawerTitle>Capture a task</DrawerTitle>
              <DrawerDescription>
                Writes to the repo's <code>backlog.md</code> — you never touch git.
              </DrawerDescription>
            </DrawerHeader>

            {/* Only the fields scroll; the footer stays reachable without
                scrolling nine inputs on a phone. */}
            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pb-2">
              <div className="grid gap-2 sm:grid-cols-[9rem_1fr]">
                <Input
                  placeholder="ID (e.g. C1.3)"
                  aria-label="Task ID"
                  value={draft.id}
                  onChange={(e) => set("id", e.target.value)}
                />
                <Input
                  placeholder="Title"
                  aria-label="Title"
                  value={draft.title}
                  onChange={(e) => set("title", e.target.value)}
                />
              </div>

              <Textarea
                className="min-h-16"
                rows={2}
                placeholder="Intent — what becomes true, and why now"
                aria-label="Intent"
                value={draft.intent}
                onChange={(e) => set("intent", e.target.value)}
              />

              <div className="flex flex-wrap gap-1.5">
                {TIERS.map((tier) => (
                  <Button
                    key={tier}
                    type="button"
                    size="sm"
                    variant={draft.autonomy === tier ? "default" : "outline"}
                    onClick={() => set("autonomy", draft.autonomy === tier ? "" : tier)}
                  >
                    {tier}
                  </Button>
                ))}
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <Input
                  placeholder="Touches — comma separated"
                  aria-label="Touches"
                  value={draft.touches}
                  onChange={(e) => set("touches", e.target.value)}
                />
                <Input
                  placeholder="Must NOT — comma separated"
                  aria-label="Must NOT"
                  value={draft.mustNot}
                  onChange={(e) => set("mustNot", e.target.value)}
                />
              </div>

              <Input
                placeholder="Oracle — how 'done' is verified"
                aria-label="Oracle"
                value={draft.oracle}
                onChange={(e) => set("oracle", e.target.value)}
              />
              <Input
                placeholder="Evidence — ≥2 pointable proofs, comma separated"
                aria-label="Evidence"
                value={draft.evidence}
                onChange={(e) => set("evidence", e.target.value)}
              />
              <Input
                placeholder="Escalate if — when to stop and ask"
                aria-label="Escalate if"
                value={draft.escalateIf}
                onChange={(e) => set("escalateIf", e.target.value)}
              />

              <p
                data-testid="capture-dor"
                className={cn(
                  "text-sm",
                  dor.ready
                    ? "text-emerald-700 dark:text-emerald-400"
                    : "text-amber-700 dark:text-amber-400",
                )}
              >
                {dor.ready
                  ? "READY — every Definition-of-Ready field is present."
                  : `DRAFT — still missing: ${dor.missing.map((f) => FIELD_LABEL[f]).join(", ")}`}
              </p>
            </div>

            <DrawerFooter className="shrink-0 flex-row justify-end gap-2 border-t">
              <DrawerClose asChild>
                <Button variant="outline">Cancel</Button>
              </DrawerClose>
              <Button
                onClick={submit}
                disabled={!submittable || pending}
                data-testid="submit-capture"
              >
                {pending && <Loader2 className="size-3.5 animate-spin" />}
                Add to backlog
              </Button>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>

      {result && <WriteOutcomeNotice result={result} />}
    </div>
  );
}
