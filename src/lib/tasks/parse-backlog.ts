import type { AutonomyTier, Evidence, EvidenceKind, Task, TaskStatus } from "@/lib/tasks/types";

/**
 * Pure: parse a `backlog.md` into structured Tasks (architecture §6). Uses a
 * deterministic block grammar (below); irregular prose is ignored. If a real
 * backlog can't be parsed, the fix is to conform it to this grammar, not to
 * loosen the parser (F3 escalate-if).
 *
 * Grammar:
 *   ### <id> · <title>  → **[S|P|D|T]**        section header sets a default tier
 *   - <marker> **<id>** <title> → **[D]**       a task; optional per-task tier
 *       - **Intent:** ...
 *       - **Touches:** a · b   **Must NOT:** c   (may share a line)
 *       - **Oracle:** ...
 *       - **Evidence:** a · b · c
 *       - **Escalate if:** ...
 * markers: [x]/✓ done · → in-progress · ⏸ blocked · ↷ stretch · [ ]/·/✎ todo
 */

const TASK_RE = /^\s*-\s*(\[[ xX]\]|·|✎|⏸|↷|✓|→)\s*\*\*([\w.]+)\*\*\s*(.*)$/;
const HEADER_RE = /^#{2,4}\s+(.*)$/;
const TIER_RE = /\*\*\[([SPDT])\]\*\*/;

/**
 * A line that *intends* to be a task — a bullet whose bold token is id-shaped
 * (no spaces) behind at most a short non-word marker — but fails the strict
 * grammar (Q5). Kept deliberately narrow so the report stays quiet on prose
 * (the escalate-if): a word before the bold (`- see **ADR-0004**`), a bold
 * lead-in with spaces (`- **Multi-tenant SaaS.** rest`), and a field label
 * (`**Touches:**` or `**Touches**:`) all stay unflagged — probes from the
 * PR #12 QA pass.
 */
const TASKISH_RE = /^\s*-\s*(?:(?:\[[^\]]{1,2}\]|[^\w\s*]{1,3})\s+)?\*\*([\w./-]+)\*\*(?!:)/;

const TIER: Record<string, AutonomyTier> = {
  S: "supervised",
  P: "plan-gated",
  D: "dark",
  T: "trivial",
};

const FIELD_LABELS = ["Intent", "Touches", "Must NOT", "Oracle", "Evidence", "Escalate if"];

function statusFromMarker(m: string): TaskStatus {
  if (m === "[x]" || m === "[X]" || m === "✓") return "done";
  if (m === "→") return "in-progress";
  if (m === "⏸") return "blocked";
  if (m === "↷") return "stretch";
  return "todo";
}

function tierFrom(text: string): AutonomyTier | undefined {
  const m = text.match(TIER_RE);
  return m ? TIER[m[1]] : undefined;
}

/** Grab a field's value from joined block text, up to the next field label or end. */
function grabField(text: string, label: string): string | undefined {
  const next = FIELD_LABELS.map((l) => l.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const re = new RegExp(`\\*\\*${label}:\\*\\*\\s*(.*?)(?=\\*\\*(?:${next}):\\*\\*|$)`, "is");
  const m = text.match(re);
  const val = m?.[1]?.trim();
  return val ? val : undefined;
}

function splitList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .replace(/\.\s*$/, "")
    .split(/·|;|,| and /)
    .map((s) => s.trim())
    .filter((s) => s && s !== "-");
}

function classifyEvidence(ref: string): EvidenceKind {
  const s = ref.toLowerCase();
  if (/adr[-\s]?\d/.test(s)) return "adr";
  if (/\btest\b|\.test\.|e2e|playwright/.test(s)) return "test";
  if (/audit/.test(s)) return "audit";
  if (/\.(png|jpe?g|gif|svg)\b|screenshot|image/.test(s)) return "image";
  if (/\.(ts|tsx|js|css)\b|:\d+|`[^`]+`/.test(ref)) return "file";
  return "doc";
}

function parseEvidence(value: string | undefined): Evidence[] {
  return splitList(value).map((ref) => ({ kind: classifyEvidence(ref), ref }));
}

/** A task-shaped line the grammar rejected — reported, never guessed at. */
export type SkippedLine = { line: number; text: string };

export type BacklogParse = { tasks: Task[]; skipped: SkippedLine[] };

export function parseBacklog(markdown: string, project: string): Task[] {
  return parseBacklogReport(markdown, project).tasks;
}

/**
 * Like `parseBacklog`, but also names the lines it dropped. The parser's
 * silence cost three real edits before anyone noticed ([~] markers, ids with
 * `/`) — the grammar stays strict (F3 escalate-if), the dropping just stops
 * being invisible.
 */
export function parseBacklogReport(markdown: string, project: string): BacklogParse {
  const lines = markdown.split("\n");
  const tasks: Task[] = [];
  const skipped: SkippedLine[] = [];
  let sectionTier: AutonomyTier | undefined;

  // Accumulator for the current task block.
  let cur: { marker: string; id: string; rest: string; body: string[] } | null = null;

  const flush = () => {
    if (!cur) return;
    const text = cur.body.join(" ");
    const perTaskTier = tierFrom(cur.rest);
    const title = cur.rest
      .replace(TIER_RE, "")
      .replace(/→\s*$/, "")
      .trim();
    tasks.push({
      id: cur.id,
      project,
      title,
      status: statusFromMarker(cur.marker),
      autonomy: perTaskTier ?? sectionTier,
      intent: grabField(text, "Intent"),
      touches: splitList(grabField(text, "Touches")),
      mustNot: splitList(grabField(text, "Must NOT")),
      oracle: grabField(text, "Oracle"),
      evidence: parseEvidence(grabField(text, "Evidence")),
      escalateIf: grabField(text, "Escalate if"),
    });
    cur = null;
  };

  for (const [index, line] of lines.entries()) {
    const header = line.match(HEADER_RE);
    if (header) {
      flush();
      sectionTier = tierFrom(header[1]);
      continue;
    }
    const task = line.match(TASK_RE);
    if (task) {
      flush();
      cur = { marker: task[1], id: task[2], rest: task[3], body: [] };
      continue;
    }
    const taskish = line.match(TASKISH_RE);
    if (taskish) skipped.push({ line: index + 1, text: line.trim() });
    // Strip the leading list marker so a field value can't absorb the next
    // bullet's "- " when fields sit on separate lines.
    if (cur) cur.body.push(line.replace(/^\s*-\s+/, ""));
  }
  flush();

  return { tasks, skipped };
}
