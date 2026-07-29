import {
  type Brain,
  type BrainDoc,
  type BrainInput,
  type Constraint,
  DEFAULT_BUDGET,
  type Decision,
} from "@/lib/brain/types";
import { isStartable, readiness } from "@/lib/tasks/dor";
import type { Task } from "@/lib/tasks/types";

/**
 * Pure: distil a project's docs into ONE current-truth digest (ADR-0004).
 *
 * The failure this exists to kill: a teammate's agent, lacking the project's
 * docs, proposes work that contradicts a decision the team already locked. A
 * raw doc dump does not fix that — it blows the context window and buries the
 * decision. So the digest is *selective*: locked decisions and standing
 * constraints (the things an ungrounded agent contradicts) plus the READY
 * queue (the thing it should propose against). Done work, draft tasks, ADR
 * context/consequences prose and superseded decisions are noise here.
 *
 * Budget policy (ADR-0004): decisions are load-bearing and are NEVER dropped.
 * Pressure is absorbed in priority order — ready tasks (recoverable via the
 * `ready_tasks` tool), then decision statements are trimmed, then constraints
 * give way. If the decisions alone still overflow we serve them whole and set
 * `overBudget` rather than emit a digest that lies by omission; raising the
 * budget is then a human call.
 */
export function renderBrain(input: BrainInput): Brain {
  const budget = input.budget ?? DEFAULT_BUDGET;
  const decisions = lockedDecisions(input.docs);
  const { kept: constraints, dropped: constraintsDropped } = openConstraints(input.docs);
  const ready = input.tasks.filter(isStartable);

  let keptTasks = ready.length;
  let keptConstraints = constraints.length;
  let terse = false;

  const build = () =>
    compose({
      input,
      decisions,
      terse,
      constraints,
      keptConstraints,
      ready,
      keptTasks,
    });

  let text = build();
  while (text.length > budget && keptTasks > 0) {
    keptTasks -= 1;
    text = build();
  }
  // Trim decision statements BEFORE deleting constraints outright: a clamped
  // statement still states its decision, whereas a dropped constraint says
  // nothing at all. Degrade every category before erasing one.
  if (text.length > budget && !terse) {
    terse = true;
    text = build();
  }
  while (text.length > budget && keptConstraints > 0) {
    keptConstraints -= 1;
    text = build();
  }

  const overBudget = text.length > budget;
  const omitted: string[] = [];
  if (constraintsDropped > 0) {
    omitted.push(
      `${constraintsDropped} older constraint(s) not shown — newest specs win (ADR-0004)`,
    );
  }
  if (keptTasks < ready.length) {
    omitted.push(`${ready.length - keptTasks} ready task(s) omitted — size budget`);
  }
  if (keptConstraints < constraints.length) {
    omitted.push(`${constraints.length - keptConstraints} constraint(s) omitted — size budget`);
  }
  if (terse) omitted.push("decision statements trimmed to fit the size budget");
  if (overBudget) {
    omitted.push("decisions alone exceed the size budget — raise it (ADR-0004)");
  }

  return { text, decisions, constraints, ready, omitted, overBudget };
}

// ── extraction ───────────────────────────────────────────────────────────────

const HEADING = /^#{2,4}\s/;

/**
 * `Status: Accepted` in any of the shapes real ADRs use — bare, as a bold list
 * item (`- **Status:** Accepted`), with decoration after the colon
 * (`**Status:** ✅ **Accepted** · shipped v4.6`).
 *
 * The first version of this only matched a bare line at column zero, which read
 * 29 ADRs in a real repo and found zero decisions — a digest confidently
 * claiming a project had settled nothing. Markdown decoration around a field
 * label is not an edge case, it is the common case.
 */
const ACCEPTED =
  /^[ \t]*(?:[-*+][ \t]*)?\*{0,2}status\*{0,2}[ \t]*:[ \t]*[^A-Za-z]*\*{0,2}accepted\b/im;

/** `Superseded by: <something other than none>` — a retired decision. */
const SUPERSEDED = /^[ \t]*(?:[-*+][ \t]*)?\*{0,2}superseded[ \t-]?by\*{0,2}[ \t]*:[ \t]*(.*)$/im;

const NOTHING = /^[^A-Za-z0-9]*(none|n\/?a|—|-)?[^A-Za-z0-9]*$/i;

const STATEMENT_CAP = 400;
const TERSE_CAP = 120;

/** Constraints per spec, and overall — see the selection policy in ADR-0004. */
const CONSTRAINTS_PER_DOC = 5;
const CONSTRAINTS_TOTAL = 15;

/** A doc's section body, from a matching heading to the next heading. */
function sectionOf(body: string, heading: RegExp): string | undefined {
  const lines = body.split("\n");
  const start = lines.findIndex((l) => HEADING.test(l) && heading.test(l));
  if (start === -1) return undefined;

  const out: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (HEADING.test(line)) break;
    out.push(line);
  }
  return out.join("\n").trim() || undefined;
}

/** Collapse a Markdown block into one digest-sized line. */
const collapse = (s: string): string =>
  s
    .replace(/\s*\n\s*/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

/** Trim at a sentence boundary where possible, else hard-cut on a word. */
function clamp(s: string, cap: number): string {
  if (s.length <= cap) return s;
  const window = s.slice(0, cap);
  const sentence = window.lastIndexOf(". ");
  if (sentence > cap * 0.5) return window.slice(0, sentence + 1);
  const word = window.lastIndexOf(" ");
  return `${window.slice(0, word > 0 ? word : cap).trimEnd()}…`;
}

const TABLE_ROW = /^\s*\|/;
const TABLE_RULE = /^[\s|:—-]+$/;
const TABLE_ROW_LIMIT = 6;

const cellsOf = (row: string): string[] =>
  row
    .trim()
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((c) => c.trim());

/**
 * Many ADRs record their decision as a `| Question | Decision |` table. Run
 * through the normal collapse those become a wall of pipes and dashes, which is
 * worse than useless in a digest — it burns context to say nothing. Read the
 * columns instead and emit the pairs.
 */
function summarizeTable(section: string): string | undefined {
  const rows = section.split("\n").filter((l) => TABLE_ROW.test(l));
  if (rows.length < 2) return undefined;

  const header = cellsOf(rows[0]).map((h) => h.toLowerCase());
  const decisionAt = header.findIndex((h) => h.includes("decision") || h.includes("choice"));
  const questionAt = header.findIndex(
    (h) => h.includes("question") || h.includes("topic") || h.includes("area"),
  );

  const body = rows.slice(1).filter((r) => !TABLE_RULE.test(r));
  if (body.length === 0) return undefined;

  const pairs = body.slice(0, TABLE_ROW_LIMIT).map((row) => {
    const cells = cellsOf(row);
    const decision = decisionAt >= 0 ? cells[decisionAt] : cells[cells.length - 1];
    const question = questionAt >= 0 ? cells[questionAt] : undefined;
    return question && decision ? `${question} → ${decision}` : (decision ?? "");
  });

  const summary = pairs.filter(Boolean).join(" · ");
  if (!summary) return undefined;

  return body.length > TABLE_ROW_LIMIT
    ? `${summary} (+${body.length - TABLE_ROW_LIMIT} more)`
    : summary;
}

/** An ADR that names a real superseding decision is no longer current. */
function isSuperseded(body: string): boolean {
  const match = body.match(SUPERSEDED);
  return match ? !NOTHING.test(match[1].trim()) : false;
}

/**
 * Accepted ADRs only. Superseded/Proposed/Rejected decisions are precisely what
 * a grounded agent must NOT treat as current.
 */
function lockedDecisions(docs: BrainDoc[]): Decision[] {
  return docs
    .filter((d) => d.kind === "adr" && ACCEPTED.test(d.body) && !isSuperseded(d.body))
    .map((d) => ({ id: d.id, title: d.title, statement: statementOf(d.body) }));
}

/** The decision itself: its `## Decision` section, else the first real prose. */
function statementOf(body: string): string {
  const raw = sectionOf(body, /decision/i) ?? firstProse(body);
  return summarizeTable(raw) ?? collapse(raw);
}

/** `- **Date:** 2026-05-13` — an ADR header field, not prose. */
const FIELD_LINE = /^\s*(?:[-*+]\s*)?\*{0,2}[A-Za-z][\w \-/]*\*{0,2}\s*:/;

/** A block that is mostly `Field: value` lines is the ADR's header, not its argument. */
function isMetadataBlock(paragraph: string): boolean {
  const lines = paragraph.split("\n").filter((l) => l.trim());
  if (lines.length === 0) return false;
  return lines.filter((l) => FIELD_LINE.test(l)).length >= Math.max(2, lines.length - 1);
}

/**
 * Fallback for ADRs without a `## Decision` section: the first real paragraph.
 *
 * Skips the header block. Roughly a quarter of the ADRs in a real repo have no
 * `## Decision` heading, and without this the digest quoted
 * "Status: Accepted · Date: … · Deciders: …" as the decision — filler that
 * costs context and says nothing.
 */
function firstProse(body: string): string {
  const paragraphs = body
    .split("\n\n")
    .map((p) => p.trim())
    .filter((p) => p && !p.startsWith("#") && !isMetadataBlock(p));
  return paragraphs[0] ?? "";
}

/**
 * Standing limits, from each spec's out-of-scope / non-goals section. A bullet
 * that *opens* with strikethrough has been reversed (that is how this repo
 * marks a retired non-goal) and is no longer a constraint.
 *
 * Capped per spec and overall, preferring the *latest* specs. A mature project
 * carries twenty-odd historical specs; taking every out-of-scope line from all
 * of them yielded 81 constraints in a real repo, which is not grounding, it is
 * a wall of text about decisions made two years ago. Specs sort by filename
 * (`v1-…` before `v6-…`), so the tail is the current work.
 */
function openConstraints(docs: BrainDoc[]): { kept: Constraint[]; dropped: number } {
  const perDoc = docs
    .filter((d) => d.kind === "spec")
    .map((doc) => {
      const section = sectionOf(doc.body, /out of scope|non-goals?/i);
      if (!section) return [];
      return section
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.startsWith("- "))
        .map((l) => l.slice(2).trim())
        .filter((l) => !l.startsWith("~~"))
        .map((text) => ({ text: collapse(text), source: doc.title }));
    });

  const total = perDoc.reduce((n, list) => n + list.length, 0);
  const capped = perDoc.flatMap((list) => list.slice(0, CONSTRAINTS_PER_DOC));
  const kept = capped.slice(-CONSTRAINTS_TOTAL);

  return { kept, dropped: total - kept.length };
}

// ── rendering ────────────────────────────────────────────────────────────────

type Composition = {
  input: BrainInput;
  decisions: Decision[];
  terse: boolean;
  constraints: Constraint[];
  keptConstraints: number;
  ready: Task[];
  keptTasks: number;
};

function compose(c: Composition): string {
  const { meta, docs, tasks } = c.input;
  const adrs = docs.filter((d) => d.kind === "adr").length;
  const specs = docs.filter((d) => d.kind === "spec").length;
  const drafts = tasks.filter(
    (t) => (t.status === "todo" || t.status === "stretch") && !readiness(t).ready,
  ).length;
  const inProgress = tasks.filter((t) => t.status === "in-progress").length;
  const done = tasks.filter((t) => t.status === "done").length;

  const out: string[] = [
    `# ${meta.name} — project brain`,
    "",
    meta.tagline,
    "",
    "> Distilled from the project's own Markdown docs, which remain the single source of",
    "> truth. Treat the decisions below as settled: propose work that fits them, and say so",
    "> explicitly if you think one should change.",
    "",
    "## Current state",
    "",
    `- Status: **${meta.status}**${meta.stack.length ? ` · Stack: ${meta.stack.join(", ")}` : ""}`,
    `- Tasks: ${c.ready.length} ready · ${drafts} draft · ${inProgress} in progress · ${done} done`,
    `- Docs: ${adrs} ADR(s) · ${specs} spec(s) · ${c.decisions.length} locked decision(s)`,
    "",
    "## Locked decisions",
    "",
  ];

  if (c.decisions.length === 0) {
    out.push("_No locked decisions yet._", "");
  } else {
    for (const d of c.decisions) {
      out.push(`- **${d.title}** — ${clamp(d.statement, c.terse ? TERSE_CAP : STATEMENT_CAP)}`);
    }
    out.push("");
  }

  out.push("## Open constraints", "");
  const shownConstraints = c.constraints.slice(0, c.keptConstraints);
  if (shownConstraints.length === 0) {
    out.push(
      c.constraints.length > 0
        ? `_${c.constraints.length} constraint(s) omitted for size._`
        : "_No standing constraints recorded._",
      "",
    );
  } else {
    for (const k of shownConstraints) out.push(`- ${k.text} _(${k.source})_`);
    if (c.constraints.length > shownConstraints.length) {
      out.push(`- _…${c.constraints.length - shownConstraints.length} more omitted for size._`);
    }
    out.push("");
  }

  out.push(`## Ready tasks (${c.ready.length})`, "");
  const shownTasks = c.ready.slice(0, c.keptTasks);
  if (shownTasks.length === 0) {
    out.push(
      c.ready.length > 0
        ? `_${c.ready.length} ready task(s) omitted for size._`
        : "_Nothing is READY — every open task is still a draft._",
      "",
    );
  } else {
    for (const t of shownTasks) {
      out.push(`- **${t.id}** ${t.title}${t.intent ? ` — ${t.intent}` : ""}`);
      const facts = [
        t.oracle ? `Oracle: ${t.oracle}` : null,
        t.autonomy ? `Tier: ${t.autonomy}` : null,
      ].filter(Boolean);
      if (facts.length) out.push(`  ${facts.join(" · ")}`);
    }
    if (c.ready.length > shownTasks.length) {
      out.push(`- _…${c.ready.length - shownTasks.length} more omitted for size._`);
    }
    out.push("");
  }

  return out.join("\n").trimEnd();
}
