import type { DorField, Readiness, Task } from "@/lib/tasks/types";

const MIN_EVIDENCE = 2;

/**
 * Pure Definition-of-Ready deriver. A task is READY only when every field is
 * present and it carries ≥2 pointable evidences — "presume, don't assume".
 * Trivial-tier tasks are exempt (they need no ceremony) and are always ready.
 */
export function readiness(task: Task): Readiness {
  if (task.autonomy === "trivial") return { ready: true, missing: [] };

  const missing: DorField[] = [];
  if (!task.intent?.trim()) missing.push("intent");
  if (!task.autonomy) missing.push("autonomy");
  if (task.touches.length === 0) missing.push("touches");
  if (task.mustNot.length === 0) missing.push("mustNot");
  if (!task.oracle?.trim()) missing.push("oracle");
  if (task.evidence.length < MIN_EVIDENCE) missing.push("evidence");
  if (!task.escalateIf?.trim()) missing.push("escalateIf");

  return { ready: missing.length === 0, missing };
}

export const isReady = (task: Task): boolean => readiness(task).ready;

/** A task the ops READY queue should surface: ready AND not already resolved. */
export const isStartable = (task: Task): boolean =>
  isReady(task) && (task.status === "todo" || task.status === "stretch");
