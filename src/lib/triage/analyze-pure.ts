import type { AutonomyTier } from "@/lib/tasks/types";
import type { Citation, DraftTicket, TriageKind, TriageResult } from "@/lib/triage/types";

/** Pure triage heuristic — no I/O. The mock analyzer reads docs then calls this;
 * a real Anthropic analyzer would replace the whole function. Demonstrates the
 * "AI proposes, human disposes" shape: cite real docs, draft a DoR ticket, leave
 * boundaries/oracle for the human to ground. */

export type DocLite = { kind: "adr" | "spec" | "retro"; id: string; title: string };
export type TaskLite = { id: string; title: string; intent?: string };

const STOP = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "to",
  "of",
  "in",
  "on",
  "for",
  "with",
  "we",
  "i",
  "it",
  "is",
  "be",
  "add",
  "make",
  "should",
  "can",
  "our",
  "this",
  "that",
  "as",
  "by",
]);

function tokens(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length > 2 && !STOP.has(t)),
  );
}

function overlap(a: Set<string>, b: Set<string>): number {
  let n = 0;
  for (const t of a) if (b.has(t)) n++;
  return n;
}

const VAGUE =
  /\b(maybe|not sure|explore|investigate|somehow|what if|could we|thinking about|idea)\b/i;

function guessTier(text: string): AutonomyTier {
  if (/\b(test|i18n|lint|rename|format|typo|mechanical|seed|copy)\b/i.test(text)) return "dark";
  if (/\b(migration|schema|auth|payment|money|billing|security|delete|permission)\b/i.test(text))
    return "supervised";
  return "plan-gated";
}

export function analyzeIdeaPure(text: string, docs: DocLite[], tasks: TaskLite[]): TriageResult {
  const idea = tokens(text);

  const scoredTasks = tasks
    .map((t) => ({ t, score: overlap(idea, tokens(`${t.title} ${t.intent ?? ""}`)) }))
    .sort((a, b) => b.score - a.score);
  const scoredDocs = docs
    .map((d) => ({ d, score: overlap(idea, tokens(d.title)) }))
    .sort((a, b) => b.score - a.score);

  const bestTask = scoredTasks[0];
  const bestDoc = scoredDocs[0];

  const citations: Citation[] = [];
  if (bestTask && bestTask.score >= 1)
    citations.push({
      kind: "task",
      ref: bestTask.t.id,
      label: `${bestTask.t.id} — ${bestTask.t.title}`,
    });
  if (bestDoc && bestDoc.score >= 1)
    citations.push({ kind: "adr", ref: bestDoc.d.id, label: bestDoc.d.title });

  const vague = VAGUE.test(text) || idea.size < 3;

  let kind: TriageKind;
  let message: string;
  if (bestTask && bestTask.score >= 3) {
    kind = "duplicate";
    message = `Looks like a duplicate of ${bestTask.t.id} — "${bestTask.t.title}". Confirm before creating a new ticket.`;
  } else if (bestDoc && bestDoc.score >= 3) {
    kind = "overlaps";
    message = `Overlaps an existing decision: "${bestDoc.d.title}". Check it doesn't conflict before proceeding.`;
  } else if (vague) {
    kind = "needs-spike";
    message = "Under-specified — spike to reduce unknowns before committing this to the backlog.";
  } else {
    kind = "new-task";
    message = "Looks like a clean new task. Ground the boundaries and oracle, then accept.";
  }

  const firstLine = text.trim().split("\n")[0]?.trim() ?? "";
  const title = firstLine.length > 80 ? `${firstLine.slice(0, 77)}…` : firstLine || "Untitled idea";

  const draft: DraftTicket = {
    id: "NEW",
    title,
    autonomy: guessTier(text),
    intent: text.trim(),
    touches: [],
    mustNot: [],
    oracle: undefined,
    evidence: citations.map((c) => ({ kind: c.kind === "adr" ? "adr" : "doc", ref: c.ref })),
    escalateIf: kind === "needs-spike" ? "unknowns remain after the spike" : undefined,
  };

  return { kind, message, citations, draft };
}
