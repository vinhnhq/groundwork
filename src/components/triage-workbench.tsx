"use client";

import { Loader2, Paperclip, Send } from "lucide-react";
import { useState, useTransition } from "react";
import { acceptDraft, analyzeIdea } from "@/app/ops/[project]/triage/actions";
import {
  DocAttachment,
  IdeaMessage,
  type TaggableDoc,
  VerdictMessage,
} from "@/components/triage-thread";
import { AttachmentGroup } from "@/components/ui/attachment";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Marker, MarkerContent } from "@/components/ui/marker";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller";
import { Textarea } from "@/components/ui/textarea";
import { readiness } from "@/lib/tasks/dor";
import type { AutonomyTier, Task } from "@/lib/tasks/types";
import type { DraftTicket, TriageResult } from "@/lib/triage/types";

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

export function TriageWorkbench({
  project,
  docs,
}: {
  project: string;
  /** The project's documents, so an idea can be tagged to the files it concerns. */
  docs: TaggableDoc[];
}) {
  const [text, setText] = useState("");
  const [tagged, setTagged] = useState<TaggableDoc[]>([]);
  /** The idea as sent, frozen — the composer clears but the transcript keeps it. */
  const [sent, setSent] = useState<{ text: string; tagged: TaggableDoc[] } | null>(null);
  const [result, setResult] = useState<TriageResult | null>(null);
  const [draft, setDraft] = useState<DraftTicket | null>(null);
  const [accepted, setAccepted] = useState<{ block: string; count: number } | null>(null);
  const [pending, startTransition] = useTransition();

  const dor = draft ? readiness(toTask(project, draft)) : null;

  const set = <K extends keyof DraftTicket>(key: K, value: DraftTicket[K]) =>
    setDraft((d) => (d ? { ...d, [key]: value } : d));

  function analyze() {
    if (!text.trim()) return;
    const outgoing = { text, tagged };
    startTransition(async () => {
      const r = await analyzeIdea(project, outgoing.text, outgoing.tagged.map((d) => d.id));
      setSent(outgoing);
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
    setSent(null);
    setText("");
    setTagged([]);
  }

  const toggleTag = (doc: TaggableDoc) =>
    setTagged((prev) =>
      prev.some((d) => d.id === doc.id) ? prev.filter((d) => d.id !== doc.id) : [...prev, doc],
    );

  return (
    <div className="flex flex-col gap-6">
      {/* The transcript. A scroller rather than a growing page: the draft form
          below it is the thing you work in, and it must not be pushed off-screen
          by the exchange that produced it. */}
      {/* `MessageScroller` is `size-full` — it fills a *sized* container by
          design. Given none, its 100% height resolves against an auto-height
          parent and squeezes its siblings: the composer card below rendered
          115px tall around 141px of content and clipped it. So the height lives
          here, on a wrapper, not as a max-height on the viewport. */}
      {/* Only once there is a transcript. An always-present scroller meant 320px
          of void above the composer before you had sent anything — the composer
          is the whole page until then. */}
      {sent && (
      <div className="h-80 shrink-0">
      <MessageScrollerProvider>
        <MessageScroller className="rounded-2xl bg-card ring-1 ring-foreground/10">
          <MessageScrollerViewport>
            <MessageScrollerContent className="gap-4 p-4">
              <Marker variant="separator">
                <MarkerContent>checked against this project's docs</MarkerContent>
              </Marker>

              <MessageScrollerItem>
                <IdeaMessage text={sent.text} tagged={sent.tagged} />
              </MessageScrollerItem>

              {result && (
                <MessageScrollerItem>
                  <VerdictMessage
                    kind={result.kind}
                    message={result.message}
                    citations={result.citations}
                  />
                </MessageScrollerItem>
              )}
            </MessageScrollerContent>
          </MessageScrollerViewport>
          <MessageScrollerButton />
        </MessageScroller>
      </MessageScrollerProvider>
      </div>
      )}

      {/* The composer. */}
      <Card>
        <CardContent className="flex flex-col gap-3">
          {tagged.length > 0 && (
            <AttachmentGroup>
              {tagged.map((doc) => (
                <DocAttachment key={doc.id} doc={doc} onRemove={() => toggleTag(doc)} />
              ))}
            </AttachmentGroup>
          )}

          <Field>
            <FieldLabel htmlFor="triage-idea" className="sr-only">
              Client idea
            </FieldLabel>
            <Textarea
              id="triage-idea"
              aria-label="Client idea"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              placeholder="In the client's words — e.g. they want a monthly revenue export as a spreadsheet…"
            />
            <FieldDescription>
              Tag the files it concerns and the agent will treat them as relevant. Nothing is
              written to the backlog until you ground the draft and accept it.
            </FieldDescription>
          </Field>

          <div className="flex flex-wrap items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" size="sm" disabled={docs.length === 0}>
                  <Paperclip aria-hidden />
                  Tag a file
                  {tagged.length > 0 && <Badge variant="secondary">{tagged.length}</Badge>}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="max-h-72 w-80 overflow-y-auto">
                <DropdownMenuLabel>Files in this project</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {docs.map((doc) => (
                  <DropdownMenuItem
                    key={doc.id}
                    // Keep the menu open: tagging several files in a row is the
                    // normal case, and a menu that closes per pick makes it four
                    // round trips instead of one.
                    onSelect={(e) => {
                      e.preventDefault();
                      toggleTag(doc);
                    }}
                  >
                    <span className="flex-1 truncate">{doc.title}</span>
                    {tagged.some((d) => d.id === doc.id) && (
                      <Badge variant="secondary">tagged</Badge>
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              type="button"
              size="sm"
              onClick={analyze}
              disabled={pending || !text.trim()}
              aria-busy={pending}
            >
              {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Send aria-hidden />}
              Analyze against docs
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && draft && (
        <div className="flex flex-col gap-5 rounded-2xl bg-card p-5 ring-1 ring-foreground/10">
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
