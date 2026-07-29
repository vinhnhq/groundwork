import { revalidateTag } from "next/cache";
import { projectTag } from "@/lib/content";
import { pushedRepo, touchesProjectDocs, verifySignature } from "@/lib/content/github/webhook";
import { serverEnv } from "@/lib/env-server";

/**
 * GitHub push webhook (S3): a push to a watched repo's `__project__/**` drops
 * the cached projection so the next read reflects it.
 *
 * Grounding freshness is the point of the whole feature (spec v2 §5) — an agent
 * confidently reasoning from last week's decisions is the failure v2 exists to
 * prevent — so this errs toward revalidating.
 *
 * Note: the ops pages are `force-dynamic` today, so nothing is stale to begin
 * with and this is a no-op safety net. It is wired now so that introducing
 * caching later is a config change rather than a correctness problem.
 */
export const dynamic = "force-dynamic";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

export async function POST(request: Request): Promise<Response> {
  // The raw body, not the parsed one: the signature covers the exact bytes.
  const raw = await request.text();

  const signature = verifySignature(
    raw,
    request.headers.get("x-hub-signature-256"),
    serverEnv().GITHUB_WEBHOOK_SECRET,
  );
  if (!signature.ok) return json({ error: signature.message }, signature.status);

  if (request.headers.get("x-github-event") === "ping") {
    return json({ ok: true, pong: true });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  const repo = pushedRepo(payload as never);
  if (!repo) return json({ error: "No repository in payload." }, 400);

  if (!touchesProjectDocs(payload as never)) {
    return json({ ok: true, revalidated: false, reason: "no __project__/ paths in this push" });
  }

  // Next 16 wants a cache profile alongside the tag; "max" expires the entry
  // whatever lifetime it was cached under.
  revalidateTag(projectTag(repo), "max");
  return json({ ok: true, revalidated: true, repo });
}
