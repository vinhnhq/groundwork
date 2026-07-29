import type { DocKind, ProjectMeta } from "@/lib/content/types";
import type { Task } from "@/lib/tasks/types";

/** A doc as the digest sees it: the ref plus its raw Markdown body. */
export type BrainDoc = { kind: DocKind; id: string; title: string; body: string };

/** Everything `renderBrain` needs, already read. Keeps the render pure. */
export type BrainInput = {
  meta: ProjectMeta;
  docs: BrainDoc[];
  tasks: Task[];
  /** Hard ceiling on the rendered digest, in characters. */
  budget?: number;
};

/** An ADR the team has locked in — the thing an ungrounded agent contradicts. */
export type Decision = { id: string; title: string; statement: string };

/** A still-standing limit (spec out-of-scope / non-goal). */
export type Constraint = { text: string; source: string };

export type Brain = {
  /** The digest itself — what both doors (paste, MCP) serve. */
  text: string;
  decisions: Decision[];
  constraints: Constraint[];
  ready: Task[];
  /** Human-readable notes for anything the budget forced out. */
  omitted: string[];
  /** True when even the decisions alone can't fit — the ADR-0004 escalation. */
  overBudget: boolean;
};

/** Default size budget: large enough for a real project, small enough to paste. */
export const DEFAULT_BUDGET = 8_000;
