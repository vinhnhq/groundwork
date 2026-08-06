import { z } from "zod";

import type { ToolDef } from "@/mcp/tools";

/**
 * A minimal JSON-RPC dispatcher over the same tool layer the stdio server uses
 * (ADR-0006). Framework-free on purpose: the Next route is a thin wrapper, and
 * this stays unit-testable without spinning up a server.
 *
 * This is Streamable HTTP's non-streaming half — a POST whose response is a
 * plain JSON body, which the transport explicitly permits. It does NOT
 * implement SSE upgrades or session ids, so server-initiated messages are out
 * of scope; every current tool is a simple request/response, so nothing needs
 * them yet.
 */

export const PROTOCOL_VERSION = "2025-06-18";
export const SERVER_INFO = { name: "groundwork", version: "0.2.0" } as const;

type Id = string | number | null;

export type JsonRpcResponse = {
  jsonrpc: "2.0";
  id: Id;
  result?: unknown;
  error?: { code: number; message: string };
};

const ok = (id: Id, result: unknown): JsonRpcResponse => ({ jsonrpc: "2.0", id, result });
const fail = (id: Id, code: number, message: string): JsonRpcResponse => ({
  jsonrpc: "2.0",
  id,
  error: { code, message },
});

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

/**
 * Describe a tool the way `tools/list` must, mirroring the stdio server. The
 * zod shape is emitted as real JSON Schema — a client that cannot see the
 * parameters cannot call the tool correctly.
 */
function describe(tool: ToolDef) {
  return {
    name: tool.name,
    title: tool.title,
    description: tool.description,
    inputSchema: z.toJSONSchema(z.object(tool.inputSchema)),
    annotations: { readOnlyHint: true, openWorldHint: false },
  };
}

/**
 * Dispatch one JSON-RPC message. Returns `null` for notifications, which by
 * spec get no response body.
 */
export async function handleJsonRpc(
  tools: ToolDef[],
  message: unknown,
): Promise<JsonRpcResponse | null> {
  const body = asRecord(message);
  const method = typeof body.method === "string" ? body.method : "";
  const id = (body.id ?? null) as Id;
  const params = asRecord(body.params);

  // Notifications carry no id and expect no reply.
  if (method.startsWith("notifications/")) return null;

  switch (method) {
    case "initialize": {
      const requested = params.protocolVersion;
      return ok(id, {
        protocolVersion: typeof requested === "string" ? requested : PROTOCOL_VERSION,
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
      });
    }

    case "ping":
      return ok(id, {});

    case "tools/list":
      return ok(id, { tools: tools.map(describe) });

    case "tools/call": {
      const name = typeof params.name === "string" ? params.name : "";
      const tool = tools.find((t) => t.name === name);
      if (!tool) return fail(id, -32602, `Unknown tool "${name}"`);

      try {
        const text = await tool.handler(asRecord(params.arguments));
        return ok(id, { content: [{ type: "text", text }] });
      } catch (error) {
        // Tool failures are results, not transport errors — the model should
        // see what went wrong and be able to retry with different arguments.
        return ok(id, {
          content: [{ type: "text", text: `Tool "${name}" failed: ${String(error)}` }],
          isError: true,
        });
      }
    }

    default:
      return method
        ? fail(id, -32601, `Method not found: ${method}`)
        : fail(id, -32600, "Invalid request: no method");
  }
}
