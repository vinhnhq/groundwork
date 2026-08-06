"use server";

import { revalidatePath } from "next/cache";

import { getSession } from "@/lib/auth";
import { can } from "@/lib/auth/roles";
import { getContentSource } from "@/lib/content";
import type { WriteOutcome } from "@/lib/content/write";
import { getWriter } from "@/lib/ops/write";
import { isErr } from "@/lib/result";
import type { Task, TaskStatus } from "@/lib/tasks/types";
import { appendTaskToProject, setProjectTaskStatus } from "@/lib/tasks/write-back";

/**
 * The git-free write path as the UI sees it (US-3/US-4). Both actions return a
 * plain result rather than throwing, because the caller renders the failure —
 * "which PR did my change go into" is the question this screen must answer,
 * and an exception answers it with a stack trace.
 */

export type ActionResult =
  | { ok: true; outcome: WriteOutcome; mocked: boolean }
  | { ok: false; error: string };

/**
 * A server action is a callable endpoint, not a page: it must not assume the
 * caller arrived through UI that hid the button. So every write re-checks the
 * capability the proxy checked for navigation (R1).
 */
async function authorizeWrite(): Promise<{ actor: string } | { error: string }> {
  const session = await getSession();
  if (!session) return { error: "Your session has expired — sign in again." };
  if (!can(session.user.role, "tasks.write")) {
    return { error: `The ${session.user.role} role cannot change tasks.` };
  }
  return { actor: session.user.email };
}

export async function captureTask(project: string, task: Task): Promise<ActionResult> {
  const auth = await authorizeWrite();
  if ("error" in auth) return { ok: false, error: auth.error };

  const { writer, mocked } = getWriter();
  const result = await appendTaskToProject(
    { source: getContentSource(), writer, actor: auth.actor },
    project,
    task,
  );

  if (isErr(result)) return { ok: false, error: result.error.message };

  revalidatePath(`/ops/${project}`);
  return { ok: true, outcome: result.value, mocked };
}

export async function changeTaskStatus(
  project: string,
  taskId: string,
  status: TaskStatus,
): Promise<ActionResult> {
  const auth = await authorizeWrite();
  if ("error" in auth) return { ok: false, error: auth.error };

  const { writer, mocked } = getWriter();
  const result = await setProjectTaskStatus(
    { source: getContentSource(), writer, actor: auth.actor },
    project,
    taskId,
    status,
  );

  if (isErr(result)) return { ok: false, error: result.error.message };

  revalidatePath(`/ops/${project}`);
  return { ok: true, outcome: result.value, mocked };
}
