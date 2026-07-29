import type { ContentSource } from "@/lib/content/source";
import type { BacklogWriter, WriteError, WriteOutcome } from "@/lib/content/write";
import { err, isErr, ok, type Result } from "@/lib/result";
import { appendTask, setTaskStatus } from "@/lib/tasks/serialize";
import type { Task, TaskStatus } from "@/lib/tasks/types";

/**
 * The git-free write path (US-3/US-4): read the canonical backlog, apply a pure
 * transform, hand the result to whichever transport is configured.
 *
 * The repo Markdown stays the single source of truth — this never records a
 * task anywhere else. Every write is read-modify-write against the current file
 * for that reason.
 */

type Ctx = { source: ContentSource; writer: BacklogWriter; actor: string };

async function resolve(
  source: ContentSource,
  slug: string,
): Promise<Result<WriteError, { root: string; backlog: string }>> {
  const project = await source.getProject(slug);
  if (!project) {
    return err({ _tag: "ProjectNotFound" as const, message: `No project "${slug}".` });
  }

  const backlog = await source.readBacklog(slug);
  if (backlog === null) {
    return err({
      _tag: "NoBacklog" as const,
      message: `"${slug}" has no __project__/tasks/backlog.md to write to.`,
    });
  }

  return ok({ root: project.root, backlog });
}

/** Capture a new task at the end of the project's backlog. */
export async function appendTaskToProject(
  { source, writer, actor }: Ctx,
  slug: string,
  task: Task,
): Promise<Result<WriteError, WriteOutcome>> {
  const resolved = await resolve(source, slug);
  if (isErr(resolved)) return resolved;

  const next = appendTask(resolved.value.backlog, task);
  if (isErr(next)) {
    return err({
      _tag: "DuplicateTask" as const,
      message: `Task "${task.id}" already exists in ${slug}.`,
    });
  }

  return writer.write({
    slug,
    root: resolved.value.root,
    content: next.value,
    message: `tasks(${slug}): add ${task.id} — ${task.title}`,
    actor,
  });
}

/** Move a task between statuses (ready → in-progress → done). */
export async function setProjectTaskStatus(
  { source, writer, actor }: Ctx,
  slug: string,
  taskId: string,
  status: TaskStatus,
): Promise<Result<WriteError, WriteOutcome>> {
  const resolved = await resolve(source, slug);
  if (isErr(resolved)) return resolved;

  const next = setTaskStatus(resolved.value.backlog, taskId, status);
  if (isErr(next)) {
    return err({
      _tag: "TaskNotFound" as const,
      message: `No task "${taskId}" in ${slug}'s backlog.`,
    });
  }

  return writer.write({
    slug,
    root: resolved.value.root,
    content: next.value,
    message: `tasks(${slug}): ${taskId} → ${status}`,
    actor,
  });
}
