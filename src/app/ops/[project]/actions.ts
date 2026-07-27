"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth-mock";
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

async function actor(): Promise<string> {
  const session = await getSession();
  return session?.user.name ?? "unknown";
}

export async function captureTask(project: string, task: Task): Promise<ActionResult> {
  const { writer, mocked } = getWriter();
  const result = await appendTaskToProject(
    { source: getContentSource(), writer, actor: await actor() },
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
  const { writer, mocked } = getWriter();
  const result = await setProjectTaskStatus(
    { source: getContentSource(), writer, actor: await actor() },
    project,
    taskId,
    status,
  );

  if (isErr(result)) return { ok: false, error: result.error.message };

  revalidatePath(`/ops/${project}`);
  return { ok: true, outcome: result.value, mocked };
}
