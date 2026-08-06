import type { AutonomyTier, Evidence } from "@/lib/tasks/types";

export type IdeaInput = {
  project: string;
  text: string;
  /**
   * Doc ids the human tagged onto the idea.
   *
   * Not decoration: a tagged doc is *asserted* relevant, so it is always cited
   * and its overlap score is floored — the analyzer's token heuristic cannot see
   * that "the export thing" means ADR-0004, but the person typing it can.
   */
  tagged?: readonly string[];
};

export type TriageKind = "duplicate" | "overlaps" | "needs-spike" | "new-task";

export type Citation = { kind: "adr" | "task"; ref: string; label: string };

/** A DoR-shaped ticket the analyzer proposes; the human grounds + disposes. */
export type DraftTicket = {
  id: string;
  title: string;
  autonomy?: AutonomyTier;
  intent?: string;
  touches: string[];
  mustNot: string[];
  oracle?: string;
  evidence: Evidence[];
  escalateIf?: string;
};

export type TriageResult = {
  kind: TriageKind;
  message: string;
  citations: Citation[];
  draft: DraftTicket;
};
