import { renderBrain } from "@/lib/brain/render-brain";
import type { Brain, BrainAudience, BrainDoc } from "@/lib/brain/types";
import type { ContentSource } from "@/lib/content/source";
import { parseBacklog } from "@/lib/tasks/parse-backlog";

/**
 * The subset of `ContentSource` the Brain actually reads (Q4). Taking the
 * narrow type here — rather than casting at a call site — is what lets the
 * MCP layer's read-only `Pick` be a real guarantee instead of a claim.
 */
export type BrainSource = Pick<
  ContentSource,
  "getProject" | "listDocs" | "readDoc" | "readBacklog"
>;

/**
 * Assemble a project's Brain from any ContentSource.
 *
 * Deliberately free of `server-only` and of Next imports: both doors run this —
 * the HTTP export route inside Next, and the MCP server as a standalone bun
 * process (G3). One assembler, so the two doors cannot drift apart.
 */
export async function loadBrain(
  slug: string,
  source: BrainSource,
  budget?: number,
  audience?: BrainAudience,
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

  return renderBrain({ meta: project.meta, docs, tasks, budget, audience });
}
