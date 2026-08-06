import { getSession } from "@/lib/auth";
import { can } from "@/lib/auth/roles";
import { isBrainAudience } from "@/lib/brain";
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
  request: Request,
  { params }: { params: Promise<{ project: string }> },
): Promise<Response> {
  const { project } = await params;

  /**
   * `?audience=tech|biz|both`, defaulting to `both`.
   *
   * An unrecognised value falls back to `both` rather than 400ing: the doors
   * must agree, and a typo that silently served *less* than the caller expected
   * would be the dangerous failure — an agent grounded on a partial digest
   * cannot tell that it was.
   */
  const requested = new URL(request.url).searchParams.get("audience") ?? "both";
  const audience = isBrainAudience(requested) ? requested : "both";

  // The proxy gates this path too; repeated here because a route handler is a
  // callable endpoint and must not assume the caller came through the proxy.
  const session = await getSession();
  if (!session || !can(session.user.role, "grounding.read")) {
    return new Response("Not available to your role.\n", {
      status: 403,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  const brain = await loadProjectBrain(project, undefined, audience);

  if (!brain) {
    return new Response(`No project "${project}".\n`, {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  return new Response(brain.text, {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "content-disposition": `inline; filename="${project}-context-${audience}.md"`,
      "cache-control": "no-store",
    },
  });
}
