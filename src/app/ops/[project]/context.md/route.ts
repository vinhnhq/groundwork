import { loadProjectBrain } from "@/lib/ops/brain";

/**
 * The paste door's file half: the digest as a downloadable `.md`.
 *
 * Serves byte-for-byte what the Copy-context button copies and what the MCP
 * `get_project_context` tool returns — all three call `loadBrain` (ADR-0004),
 * so there is exactly one digest and the doors cannot drift.
 *
 * `no-store` because grounding freshness is the point (spec v2 §5): a cached
 * digest would quietly ground an agent in yesterday's decisions.
 */
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ project: string }> },
): Promise<Response> {
  const { project } = await params;
  const brain = await loadProjectBrain(project);

  if (!brain) {
    return new Response(`No project "${project}".\n`, {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  return new Response(brain.text, {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "content-disposition": `inline; filename="${project}-context.md"`,
      "cache-control": "no-store",
    },
  });
}
