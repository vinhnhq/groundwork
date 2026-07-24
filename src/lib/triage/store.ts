import type { AutonomyTier } from "@/lib/tasks/types";
import type { DraftTicket } from "@/lib/triage/types";

/**
 * MOCK write-back target — an in-memory list of accepted tickets (resets on
 * restart). The real write-back appends `renderBacklogBlock` to the project's
 * backlog.md via a git commit/PR (v3, ADR-0002). `renderBacklogBlock` is the
 * bridge that stays.
 */
const accepted = new Map<string, DraftTicket[]>();

export function recordAccepted(project: string, ticket: DraftTicket): void {
  const list = accepted.get(project) ?? [];
  list.push(ticket);
  accepted.set(project, list);
}

export function listAccepted(project: string): DraftTicket[] {
  return accepted.get(project) ?? [];
}

const TIER_MARK: Record<AutonomyTier, string> = {
  supervised: "S",
  "plan-gated": "P",
  dark: "D",
  trivial: "T",
};

/** Render a DraftTicket as a backlog.md block conforming to the parser grammar. */
export function renderBacklogBlock(t: DraftTicket): string {
  const tier = t.autonomy ? `  → **[${TIER_MARK[t.autonomy]}]**` : "";
  const lines = [`- · **${t.id}** ${t.title}${tier}`];
  if (t.intent) lines.push(`    - **Intent:** ${t.intent}`);
  const boundaries = [
    t.touches.length ? `**Touches:** ${t.touches.join(" · ")}` : "",
    t.mustNot.length ? `**Must NOT:** ${t.mustNot.join(" · ")}` : "",
  ]
    .filter(Boolean)
    .join("   ");
  if (boundaries) lines.push(`    - ${boundaries}`);
  if (t.oracle) lines.push(`    - **Oracle:** ${t.oracle}`);
  if (t.evidence.length)
    lines.push(`    - **Evidence:** ${t.evidence.map((e) => e.ref).join(" · ")}`);
  if (t.escalateIf) lines.push(`    - **Escalate if:** ${t.escalateIf}`);
  return lines.join("\n");
}
