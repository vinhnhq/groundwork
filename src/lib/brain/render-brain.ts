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
 * Pressure is absorbed in priority order — ready tasks, then constraints, then
 * by trimming decision *statements*. If the decisions alone still overflow we
 * serve them whole and set `overBudget` rather than emit a digest that lies by
 * omission; raising the budget is then a human call.
 */
export function renderBrain(input: BrainInput): Brain {
  const budget = input.budget ?? DEFAULT_BUDGET;
  const decisions = lockedDecisions(input.docs);
  const constraints = openConstraints(input.docs);
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
  while (text.length > budget && keptConstraints > 0) {
    keptConstraints -= 1;
    text = build();
  }
  if (text.length > budget && !terse) {
    terse = true;
    text = build();
  }

  const overBudget = text.length > budget;
  const omitted: string[] = [];
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
const ACCEPTED = /^status:\s*accepted\b/im;
const STATEMENT_CAP = 400;
const TERSE_CAP = 120;

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

/**
 * Accepted ADRs only. Superseded/Proposed/Rejected decisions are precisely what
 * a grounded agent must NOT treat as current.
 */
function lockedDecisions(docs: BrainDoc[]): Decision[] {
  return docs
    .filter((d) => d.kind === "adr" && ACCEPTED.test(d.body))
    .map((d) => ({
      id: d.id,
      title: d.title,
      statement: collapse(sectionOf(d.body, /decision/i) ?? firstProse(d.body)),
    }));
}

/** Fallback for ADRs without a `## Decision` section: the first real paragraph. */
function firstProse(body: string): string {
  const paragraphs = body
    .split("\n\n")
    .map((p) => p.trim())
    .filter((p) => p && !p.startsWith("#") && !/^status:/i.test(p));
  return paragraphs[0] ?? "";
}

/**
 * Standing limits, from each spec's out-of-scope / non-goals section. A bullet
 * that *opens* with strikethrough has been reversed (that is how this repo
 * marks a retired non-goal) and is no longer a constraint.
 */
function openConstraints(docs: BrainDoc[]): Constraint[] {
  return docs
    .filter((d) => d.kind === "spec")
    .flatMap((doc) => {
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
