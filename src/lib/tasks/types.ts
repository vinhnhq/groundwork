/** Task model + Definition-of-Ready fields (architecture §6). */

export type AutonomyTier = "supervised" | "plan-gated" | "dark" | "trivial";

export type TaskStatus = "todo" | "in-progress" | "done" | "blocked" | "stretch";

export type EvidenceKind = "file" | "adr" | "test" | "image" | "doc" | "audit";

export type Evidence = { kind: EvidenceKind; ref: string };

export type Task = {
  id: string;
  project: string;
  title: string;
  status: TaskStatus;
  autonomy?: AutonomyTier;
  intent?: string;
  touches: string[];
  mustNot: string[];
  oracle?: string;
  evidence: Evidence[];
  escalateIf?: string;
};

/** The DoR fields a task can be missing. */
export type DorField =
  | "intent"
  | "autonomy"
  | "touches"
  | "mustNot"
  | "oracle"
  | "evidence"
  | "escalateIf";

export type Readiness = { ready: boolean; missing: DorField[] };
