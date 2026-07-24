import type { AutonomyTier, Evidence } from "@/lib/tasks/types";

export type IdeaInput = { project: string; text: string };

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
