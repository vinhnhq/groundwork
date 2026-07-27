import type { AutonomyTier, DorField, TaskStatus } from "@/lib/tasks/types";
import { cn } from "@/lib/utils";

function Pill({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        className,
      )}
    >
      {children}
    </span>
  );
}

const TIER_STYLE: Record<AutonomyTier, string> = {
  supervised: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  "plan-gated": "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  dark: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  trivial: "bg-muted text-foreground ",
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
  if (!tier) return <Pill className="bg-muted text-muted-foreground">no tier</Pill>;
  return <Pill className={TIER_STYLE[tier]}>{TIER_LABEL[tier]}</Pill>;
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

const STATUS_STYLE: Record<TaskStatus, string> = {
  todo: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  "in-progress": "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300",
  done: "bg-muted text-muted-foreground ",
  blocked: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  stretch: "bg-muted text-muted-foreground ",
};

export function StatusBadge({ status }: { status: TaskStatus }) {
  return <Pill className={STATUS_STYLE[status]}>{status}</Pill>;
}
