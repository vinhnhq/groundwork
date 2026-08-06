import { Badge } from "@/components/ui/badge";
import type { AutonomyTier, DorField, TaskStatus } from "@/lib/tasks/types";
import { cn } from "@/lib/utils";

/**
 * Domain badges — wrappers over the pristine `ui/badge`, per the
 * wrapper-over-pristine rule (CLAUDE.md). The primitive owns shape and
 * spacing; these own which colour a tier or status earns.
 */

const TIER_STYLE: Record<AutonomyTier, string> = {
  supervised: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  "plan-gated": "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  dark: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  trivial: "bg-muted text-foreground",
};

const TIER_LABEL: Record<AutonomyTier, string> = {
  supervised: "Supervised",
  "plan-gated": "Plan-gated",
  dark: "Dark",
  trivial: "Trivial",
};

export function TierBadge({ tier }: { tier?: AutonomyTier }) {
  // A missing tier is an unfilled field, not an error. Rendering it red made
  // every legacy task in a real backlog look broken.
  if (!tier) {
    return (
      <Badge variant="secondary" className="text-muted-foreground">
        no tier
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className={cn("border-transparent", TIER_STYLE[tier])}>
      {TIER_LABEL[tier]}
    </Badge>
  );
}

/**
 * Status earns a variant, not a bespoke colour.
 *
 * The previous version painted every status its own hue — blue todo, purple
 * in-progress, red blocked — which made a backlog read as a paint chart and
 * spent the reader's attention on the column that varies least. This is the
 * mapping the infinite-oneness tables use: the terminal-good state is filled,
 * the genuinely bad one is destructive, and everything mid-flight is neutral.
 * `blocked` keeps red because it is the one status that asks for action.
 */
const STATUS_VARIANT: Record<TaskStatus, "default" | "secondary" | "destructive"> = {
  done: "default",
  blocked: "destructive",
  todo: "secondary",
  "in-progress": "secondary",
  stretch: "secondary",
};

export function StatusBadge({ status }: { status: TaskStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{status}</Badge>;
}

const FIELD_LABEL: Record<DorField, string> = {
  intent: "intent",
  autonomy: "autonomy",
  touches: "touches",
  mustNot: "must-not",
  oracle: "oracle",
  evidence: "evidence",
  escalateIf: "escalate-if",
};

/**
 * How far a task is from READY.
 *
 * Spelling out all seven fields on every row was the first thing you saw on a
 * real backlog: the identical 60-character string repeated twenty-seven times,
 * carrying no information precisely because it never varied. A count scans;
 * the detail stays one hover away, and short lists still read in full.
 */
export function DorGaps({ missing }: { missing: DorField[] }) {
  if (missing.length === 0) return null;

  const full = missing.map((f) => FIELD_LABEL[f]).join(", ");
  const brief = missing.length <= 3 ? `missing ${full}` : `${missing.length} DoR fields missing`;

  return (
    <span title={full} className="text-xs text-amber-700 dark:text-amber-400">
      {brief}
    </span>
  );
}
