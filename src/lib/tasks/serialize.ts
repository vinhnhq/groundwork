import { err, ok, type Result } from "@/lib/result";
import type { AutonomyTier, Task, TaskStatus } from "@/lib/tasks/types";

/**
 * The inverse of `parse-backlog.ts`: Task → the exact block grammar the parser
 * reads back. Pure, so write-back is testable without touching a repo.
 *
 * These two must stay inverses. `serialize.test.ts` asserts the round trip
 * directly rather than eyeballing the output, because a silent drift here
 * corrupts the file that is the project's single source of truth.
 */

const MARKER: Record<TaskStatus, string> = {
  todo: "·",
  "in-progress": "→",
  done: "[x]",
  blocked: "⏸",
  stretch: "↷",
};

const TIER_LETTER: Record<AutonomyTier, string> = {
  supervised: "S",
  "plan-gated": "P",
  dark: "D",
  trivial: "T",
};

const INDENT = "  ";

/** `- · **G1** Title  → **[P]**` plus its indented DoR fields. */
export function renderTask(task: Task): string {
  const tier = task.autonomy ? `  → **[${TIER_LETTER[task.autonomy]}]**` : "";
  const lines = [`- ${MARKER[task.status]} **${task.id}** ${task.title}${tier}`];

  const field = (label: string, value: string | undefined) => {
    if (value?.trim()) lines.push(`${INDENT}- **${label}:** ${value.trim()}`);
  };

  field("Intent", task.intent);
  if (task.touches.length > 0 || task.mustNot.length > 0) {
    // Touches and Must NOT share a line, as the parser's grammar allows.
    const parts: string[] = [];
    if (task.touches.length > 0) parts.push(`**Touches:** ${task.touches.join(" · ")}`);
    if (task.mustNot.length > 0) parts.push(`**Must NOT:** ${task.mustNot.join(" · ")}`);
    lines.push(`${INDENT}- ${parts.join("   ")}`);
  }
  field("Oracle", task.oracle);
  if (task.evidence.length > 0) {
    field("Evidence", task.evidence.map((e) => e.ref).join(" · "));
  }
  field("Escalate if", task.escalateIf);

  return lines.join("\n");
}

export type WriteTextError =
  | { readonly _tag: "TaskNotFound"; readonly id: string }
  | { readonly _tag: "DuplicateTask"; readonly id: string };

const taskLineRe = (id: string) =>
  new RegExp(`^\\s*-\\s*(\\[[ xX]\\]|·|✎|⏸|↷|✓|→)\\s*\\*\\*${escapeId(id)}\\*\\*`);

const escapeId = (id: string) => id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Append a task block to the end of the backlog.
 *
 * Deliberately appends rather than slotting into a section: guessing where a
 * new task "belongs" would silently reorder a human-curated file. A human (or
 * the PR review) moves it.
 */
export function appendTask(markdown: string, task: Task): Result<WriteTextError, string> {
  if (markdown.split("\n").some((line) => taskLineRe(task.id).test(line))) {
    return err({ _tag: "DuplicateTask", id: task.id });
  }

  const body = markdown.replace(/\s*$/, "");
  return ok(`${body}\n\n${renderTask(task)}\n`);
}

/** Flip one task's status marker in place, leaving every other byte alone. */
export function setTaskStatus(
  markdown: string,
  id: string,
  status: TaskStatus,
): Result<WriteTextError, string> {
  const lines = markdown.split("\n");
  const re = taskLineRe(id);
  const index = lines.findIndex((line) => re.test(line));

  if (index === -1) return err({ _tag: "TaskNotFound", id });

  lines[index] = lines[index].replace(
    /^(\s*-\s*)(\[[ xX]\]|·|✎|⏸|↷|✓|→)(\s*)/,
    `$1${MARKER[status]}$3`,
  );
  return ok(lines.join("\n"));
}
