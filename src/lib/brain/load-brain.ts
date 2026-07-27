import { renderBrain } from "@/lib/brain/render-brain";
import type { Brain, BrainDoc } from "@/lib/brain/types";
import type { ContentSource } from "@/lib/content/source";
import { parseBacklog } from "@/lib/tasks/parse-backlog";

/**
 * Assemble a project's Brain from any ContentSource.
 *
 * Deliberately free of `server-only` and of Next imports: both doors run this —
 * the HTTP export route inside Next, and the MCP server as a standalone bun
 * process (G3). One assembler, so the two doors cannot drift apart.
 */
export async function loadBrain(
  slug: string,
  source: ContentSource,
  budget?: number,
): Promise<Brain | null> {
  const project = await source.getProject(slug);
  if (!project) return null;

  const refs = await source.listDocs(slug);
  const docs: BrainDoc[] = [];
  for (const ref of refs) {
    const body = await source.readDoc(slug, ref.kind, ref.id);
    if (body !== null) docs.push({ kind: ref.kind, id: ref.id, title: ref.title, body });
  }

  const backlog = await source.readBacklog(slug);
  const tasks = backlog ? parseBacklog(backlog, slug) : [];

  return renderBrain({ meta: project.meta, docs, tasks, budget });
}
