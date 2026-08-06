import type { DocKind, ProjectMeta } from "@/lib/content/types";
import type { Task } from "@/lib/tasks/types";

/** A doc as the digest sees it: the ref plus its raw Markdown body. */
export type BrainDoc = { kind: DocKind; id: string; title: string; body: string };

/**
 * Who the digest is for.
 *
 * One digest served an engineer's agent and a client's agent equally badly: the
 * first wants locked ADRs and READY tasks, the second wants state and progress
 * — and must not be handed the team's internal reasoning. So this is a
 * disclosure control as much as an ergonomic one.
 *
 * `both` is the default and stays **byte-identical** to the pre-split output,
 * because ADR-0004/ADR-0006 require the three doors (clipboard, `context.md`,
 * MCP) to agree byte for byte.
 */
export type BrainAudience = "tech" | "biz" | "both";

export const BRAIN_AUDIENCES: readonly BrainAudience[] = ["tech", "biz", "both"] as const;

export const isBrainAudience = (v: string): v is BrainAudience =>
  (BRAIN_AUDIENCES as readonly string[]).includes(v);

/** Everything `renderBrain` needs, already read. Keeps the render pure. */
export type BrainInput = {
  meta: ProjectMeta;
  docs: BrainDoc[];
  tasks: Task[];
  /** Hard ceiling on the rendered digest, in characters. */
  budget?: number;
  /** Defaults to `both` — the full digest. */
  audience?: BrainAudience;
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
