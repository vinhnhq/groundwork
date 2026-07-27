import { getContentSource } from "@/lib/content";
import { serverEnv } from "@/lib/env-server";
import { checkBearer } from "@/mcp/auth";
import { handleJsonRpc } from "@/mcp/http";
import { createGroundworkTools } from "@/mcp/tools";

/**
 * The team's shared grounding endpoint (G4) — the same four read-only tools as
 * the stdio server, reachable from a teammate's machine.
 *
 * Gated by a bearer token, not the session cookie: an agent connecting from
 * someone else's laptop has no session. Roles arrive with R1; until then the
 * token is all-or-nothing read access, which matches the tools' read-only
 * surface.
 */
export const dynamic = "force-dynamic";

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

export async function POST(request: Request): Promise<Response> {
  const env = serverEnv();
  const auth = checkBearer(
    request.headers.get("authorization"),
    env.MCP_TOKEN,
    process.env.NODE_ENV === "production",
  );

  if (!auth.ok) {
    return json({ error: auth.message }, auth.status);
  }

  let message: unknown;
  try {
    message = await request.json();
  } catch {
    return json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }, 400);
  }

  const tools = createGroundworkTools(getContentSource());
  const response = await handleJsonRpc(tools, message);

  // Notifications get no body — 202 Accepted, per the transport spec.
  return response === null ? new Response(null, { status: 202 }) : json(response);
}

/**
 * SSE upgrades are not implemented (see `http.ts`): every current tool is
 * request/response, so nothing needs a server-initiated stream. Saying so
 * beats a bare 405 that leaves a client guessing.
 */
export function GET(): Response {
  return json(
    { error: "This endpoint speaks JSON-RPC over POST. SSE streaming is not implemented." },
    405,
  );
}
