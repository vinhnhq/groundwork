"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useState, useTransition } from "react";
import { acceptDraft, analyzeIdea } from "@/app/ops/[project]/triage/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { readiness } from "@/lib/tasks/dor";
import type { AutonomyTier, Task } from "@/lib/tasks/types";
import type { DraftTicket, TriageKind, TriageResult } from "@/lib/triage/types";

/**
 * The verdict's colour. `destructive` is the primitive's own; the other three
 * carry a Tailwind palette tint over `secondary`, per tech-standards §13 (reach
 * for a fixed palette colour rather than inventing a token).
 */
const KIND_VARIANT: Record<TriageKind, "secondary" | "destructive"> = {
  duplicate: "destructive",
  overlaps: "secondary",
  "needs-spike": "secondary",
  "new-task": "secondary",
};

const KIND_TINT: Partial<Record<TriageKind, string>> = {
  overlaps: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  "needs-spike": "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300",
  "new-task": "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
};

const TIERS: AutonomyTier[] = ["supervised", "plan-gated", "dark", "trivial"];

/** Radix Select rejects `value=""`, so absence needs a sentinel. */
const NO_TIER = "__none__";

const csv = (arr: string[]) => arr.join(", ");
const parseCsv = (s: string) =>
  s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

function toTask(project: string, d: DraftTicket): Task {
  return { ...d, project, status: "todo" };
}

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
      <Card>
        <CardHeader>
          <CardTitle className="text-base">The idea</CardTitle>
          <CardDescription>
            In the client's words. The agent checks it against this project's locked decisions and
            open constraints before drafting anything.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="triage-idea">Client idea</FieldLabel>
            <Textarea
              id="triage-idea"
              aria-label="Client idea"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              placeholder="e.g. The client wants a monthly revenue export as a spreadsheet…"
            />
            <FieldDescription>
              Nothing is written to the backlog until you ground the draft and accept it.
            </FieldDescription>
          </Field>

          <div>
            <Button
              type="button"
              onClick={analyze}
              disabled={pending || !text.trim()}
              aria-busy={pending}
            >
              {pending ? (
                <Loader2 className="animate-spin" aria-hidden />
              ) : (
                <Sparkles aria-hidden />
              )}
              Analyze against docs
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && draft && (
        <div className="flex flex-col gap-5 rounded-2xl bg-card p-5 ring-1 ring-foreground/10">
          <div className="flex flex-col gap-2">
            <Badge variant={KIND_VARIANT[result.kind]} className={KIND_TINT[result.kind]}>
              {result.kind}
            </Badge>
            <p className="text-sm">{result.message}</p>
            {result.citations.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Grounded in: {result.citations.map((c) => c.label).join(" · ")}
              </p>
            )}
          </div>

          <div className="grid gap-3">
            <Field>
              <FieldLabel htmlFor="draft-title">Title</FieldLabel>
              <Input
                id="draft-title"
                value={draft.title}
                onChange={(e) => set("title", e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel>Autonomy</FieldLabel>
              <Select
                value={draft.autonomy ?? NO_TIER}
                onValueChange={(v) =>
                  set("autonomy", v === NO_TIER ? undefined : (v as AutonomyTier))
                }
              >
                <SelectTrigger aria-label="Autonomy">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {/* Radix forbids an empty-string item value, so "no tier"
                      carries a sentinel that maps back to `undefined`. */}
                  <SelectItem value={NO_TIER}>— none —</SelectItem>
                  {TIERS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="draft-intent">Intent</FieldLabel>
              <Input
                id="draft-intent"
                value={draft.intent ?? ""}
                onChange={(e) => set("intent", e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="draft-touches">Touches (comma-separated)</FieldLabel>
              <Input
                id="draft-touches"
                value={csv(draft.touches)}
                onChange={(e) => set("touches", parseCsv(e.target.value))}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="draft-must-not">Must NOT (comma-separated)</FieldLabel>
              <Input
                id="draft-must-not"
                value={csv(draft.mustNot)}
                onChange={(e) => set("mustNot", parseCsv(e.target.value))}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="draft-oracle">
                Oracle (how &quot;done&quot; is verified)
              </FieldLabel>
              <Input
                id="draft-oracle"
                value={draft.oracle ?? ""}
                onChange={(e) => set("oracle", e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="draft-evidence">Evidence (comma-separated, ≥2)</FieldLabel>
              <Input
                id="draft-evidence"
                value={csv(draft.evidence.map((ev) => ev.ref))}
                onChange={(e) =>
                  set(
                    "evidence",
                    parseCsv(e.target.value).map((ref) => ({ kind: "doc", ref })),
                  )
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="draft-escalate-if">Escalate if</FieldLabel>
              <Input
                id="draft-escalate-if"
                value={draft.escalateIf ?? ""}
                onChange={(e) => set("escalateIf", e.target.value)}
              />
            </Field>
          </div>

          <div className="flex flex-wrap items-center gap-3" data-testid="dor-status">
            {dor?.ready ? (
              <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                READY
              </Badge>
            ) : (
              <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                missing: {dor?.missing.join(", ")}
              </Badge>
            )}
            <Button type="button" size="sm" onClick={accept} disabled={!dor?.ready || pending}>
              Accept → backlog
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={dismiss}>
              Dismiss
            </Button>
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
