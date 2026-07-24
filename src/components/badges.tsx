import type { AutonomyTier, TaskStatus } from "@/lib/tasks/types";
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
  trivial: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
};

const TIER_LABEL: Record<AutonomyTier, string> = {
  supervised: "Supervised",
  "plan-gated": "Plan-gated",
  dark: "Dark",
  trivial: "Trivial",
};

export function TierBadge({ tier }: { tier?: AutonomyTier }) {
  if (!tier) return <Pill className={TIER_STYLE.supervised}>no tier</Pill>;
  return <Pill className={TIER_STYLE[tier]}>{TIER_LABEL[tier]}</Pill>;
}

const STATUS_STYLE: Record<TaskStatus, string> = {
  todo: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  "in-progress": "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300",
  done: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
  blocked: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  stretch: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
};

export function StatusBadge({ status }: { status: TaskStatus }) {
  return <Pill className={STATUS_STYLE[status]}>{status}</Pill>;
}
