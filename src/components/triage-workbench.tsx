"use client";

import { Loader2, Paperclip, Send } from "lucide-react";
import { useRef, useState, useTransition } from "react";

import { acceptDraft, analyzeIdea } from "@/app/ops/[project]/triage/actions";
import { type CaretPoint, caretCoordinates } from "@/components/caret-coordinates";
import {
  DocMention,
  type MentionQuery,
  mentionAt,
  useMentionRows,
  wrapIndex,
} from "@/components/doc-mention";
import { DocTree } from "@/components/doc-tree";
import {
  DocAttachment,
  IdeaMessage,
  type TaggableDoc,
  VerdictMessage,
} from "@/components/triage-thread";
import { AttachmentGroup } from "@/components/ui/attachment";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Marker, MarkerContent } from "@/components/ui/marker";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { DocNode } from "@/lib/content/doc-tree";
import { DOR_FIELD_LABEL, readiness } from "@/lib/tasks/dor";
import type { AutonomyTier, Task } from "@/lib/tasks/types";
import type { DraftTicket, TriageResult } from "@/lib/triage/types";

const TIERS: AutonomyTier[] = ["supervised", "plan-gated", "dark", "trivial"];

/** Caret keys that move it without changing the text. */
const NAV_KEYS = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"]);

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
  docTree,
}: {
  project: string;
  /** The project's documents, so an idea can be tagged to the files it concerns. */
  docs: TaggableDoc[];
  /** The same folder tree the sidebar shows — the picker reuses it. */
  docTree: DocNode[];
}) {
  const [text, setText] = useState("");
  const [tagged, setTagged] = useState<TaggableDoc[]>([]);
  /** The idea as sent, frozen — the composer clears but the transcript keeps it. */
  const [sent, setSent] = useState<{ text: string; tagged: TaggableDoc[] } | null>(null);
  const [browseOpen, setBrowseOpen] = useState(false);
  const [mention, setMention] = useState<MentionQuery | null>(null);
  const [point, setPoint] = useState<CaretPoint | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { rows, activeIndex, setActiveIndex, breadcrumb, enterFolder, leaveFolder, atRoot } =
    useMentionRows({ docs, tree: docTree, mention });
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
      const r = await analyzeIdea(
        project,
        outgoing.text,
        outgoing.tagged.map((d) => d.id),
      );
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

  const taggedIds = new Set(tagged.map((d) => d.id));

  /**
   * Recompute the `@…` token under the caret, and where to draw its menu.
   *
   * Derived from (text, caret) on every edit and caret move rather than latched
   * on keypress: that way a paste, an arrow key and a click into the middle of an
   * existing mention all behave the same, and backspacing past the `@` closes it.
   */
  function syncMention(next: string, caret: number | null) {
    setText(next);
    const found = caret === null ? null : mentionAt(next, caret);
    setMention(found);

    // Viewport coordinates, because the menu is `position: fixed` — `Card` is
    // `overflow-hidden` and clipped an absolutely-positioned one mid-row.
    if (found && inputRef.current) {
      const local = caretCoordinates(inputRef.current, found.start);
      const box = inputRef.current.getBoundingClientRect();
      setPoint({
        top: box.top + local.top,
        left: box.left + local.left,
        lineHeight: local.lineHeight,
      });
    } else {
      setPoint(null);
    }
  }

  /**
   * Arrows move, Enter takes, Escape closes — while the caret stays in the field.
   *
   * Intercepted here rather than inside the menu because the textarea keeps
   * focus: a menu that grabbed focus to be navigable would stop you typing
   * mid-sentence, which is the whole point of an inline mention.
   */
  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!mention) return;

    const row = rows[activeIndex];

    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => wrapIndex(i + (e.key === "ArrowDown" ? 1 : -1), rows.length));
    } else if (e.key === "Enter" || e.key === "Tab") {
      if (!row) return;
      e.preventDefault();
      // Enter means "go in" on a folder and "take it" on a file — one key for
      // both steps of parent-then-child.
      if (row.type === "folder") enterFolder(row.name);
      else pickDoc(row.doc);
    } else if (e.key === "ArrowRight" && row?.type === "folder") {
      e.preventDefault();
      enterFolder(row.name);
    } else if (e.key === "ArrowLeft" && !atRoot) {
      e.preventDefault();
      leaveFolder();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setMention(null);
    }
  }

  /**
   * Tag the file and replace the whole `@query` with its title.
   *
   * The mention was a command, not content: leaving `@arch` in the idea would
   * ship a half-typed token to the analyzer and read as a typo in the transcript.
   */
  function pickDoc(doc: TaggableDoc) {
    toggleTag(doc);

    const token = mention;
    setMention(null);
    setPoint(null);

    if (token) {
      const after = text.slice(token.start + 1 + token.query.length);
      const next = `${text.slice(0, token.start)}${doc.title} ${after}`;
      setText(next);
      // Put the caret after the inserted title, not at the end of the field.
      const caret = token.start + doc.title.length + 1;
      window.requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.setSelectionRange(caret, caret);
      });
    } else {
      inputRef.current?.focus();
    }
  }

  return (
    /**
     * A full-height column: the transcript takes what is left and scrolls, the
     * composer sits at the bottom where your hands already are. That is the
     * arrangement every chat surface uses, and it means a long exchange never
     * pushes the input off-screen.
     */
    // `justify-end` so the composer sits at the bottom even before there is a
    // transcript to fill the space above it. Once the thread exists it is
    // `flex-1` and takes the slack, and this has no further effect.
    <div className="flex min-h-0 flex-1 flex-col justify-end gap-4">
      {/* `MessageScroller` is `size-full` — it fills a *sized* container by
          design, so its height comes from this wrapper rather than a max-height
          on the viewport. Only mounted once there is a transcript: an
          always-present scroller put a void above the composer before you had
          sent anything. */}
      {sent && (
        <div className="min-h-0 flex-1">
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
                          <FieldLabel htmlFor="draft-must-not">
                            Must NOT (comma-separated)
                          </FieldLabel>
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
                          <FieldLabel htmlFor="draft-evidence">
                            Evidence (comma-separated, ≥2)
                          </FieldLabel>
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
                          // h-auto + wrap: at phone width the full list is
                          // longer than the card and must fold, not bleed.
                          <Badge className="h-auto max-w-full whitespace-normal bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                            missing: {dor?.missing.map((f) => DOR_FIELD_LABEL[f]).join(", ")}
                          </Badge>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          onClick={accept}
                          disabled={!dor?.ready || pending}
                        >
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
                        Mock write-back (in-memory). Real version commits/opens a PR against the
                        repo.
                      </p>
                    </div>
                  )}
                </MessageScrollerContent>
              </MessageScrollerViewport>
              <MessageScrollerButton />
            </MessageScroller>
          </MessageScrollerProvider>
        </div>
      )}

      {/* The composer, last in the column so it lands at the bottom. Its
          description carries what used to be the page title and blurb: the input
          *is* the surface, not something a heading introduces. */}
      <Card className="shrink-0">
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

            {/* `relative` so the mention menu can be absolutely placed at the
                caret inside it. */}
            <div className="relative">
              <Textarea
                ref={inputRef}
                id="triage-idea"
                aria-label="Client idea"
                value={text}
                onChange={(e) => syncMention(e.target.value, e.target.selectionStart)}
                onClick={(e) => syncMention(text, e.currentTarget.selectionStart)}
                onKeyUp={(e) => {
                  // Caret moves that `onChange` does not see (arrows, Home/End)
                  // still change which token is under it.
                  if (!NAV_KEYS.has(e.key)) return;
                  syncMention(text, e.currentTarget.selectionStart);
                }}
                onKeyDown={onKeyDown}
                onBlur={() => setMention(null)}
                rows={3}
                aria-autocomplete="list"
                aria-expanded={mention !== null}
                aria-controls={mention ? "doc-mention" : undefined}
                aria-activedescendant={mention ? `mention-${activeIndex}` : undefined}
                placeholder="In the client's words — type @ to tag a file…"
              />

              {mention && point && (
                <DocMention
                  rows={rows}
                  taggedIds={taggedIds}
                  activeIndex={activeIndex}
                  breadcrumb={breadcrumb}
                  anchor={point}
                  onPick={pickDoc}
                  onEnter={enterFolder}
                  onUp={leaveFolder}
                />
              )}
            </div>

            <FieldDescription>
              Paste a client idea. The agent checks it against this project's locked decisions and
              open constraints, then drafts a Definition-of-Ready ticket — you ground it and
              dispose. A file you tag with <code>@</code> is treated as relevant. Nothing is written
              to the backlog until you accept.
            </FieldDescription>
          </Field>

          <div className="flex flex-wrap items-center gap-2">
            {/* `@` is the fast path; this is the browse path — the full folder
                tree, for when you do not know the file's name. */}
            <Popover open={browseOpen} onOpenChange={setBrowseOpen}>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" size="sm" disabled={docs.length === 0}>
                  <Paperclip aria-hidden />
                  Browse files
                  {tagged.length > 0 && <Badge variant="secondary">{tagged.length}</Badge>}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                className="max-h-72 w-80 overflow-y-auto p-2"
                data-testid="doc-picker"
              >
                <p className="px-1 pb-1 text-xs text-muted-foreground">
                  Files in <code>__project__/</code>
                </p>
                <DocTree
                  nodes={docTree}
                  variant="sidebar"
                  selected={taggedIds}
                  onSelectDoc={(d) => {
                    toggleTag(d);
                    setBrowseOpen(false);
                  }}
                />
              </PopoverContent>
            </Popover>

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
    </div>
  );
}
