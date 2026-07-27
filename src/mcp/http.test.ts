import { describe, expect, it } from "vitest";
import { z } from "zod";
import { checkBearer, DEV_TOKEN } from "@/mcp/auth";
import { handleJsonRpc, PROTOCOL_VERSION } from "@/mcp/http";
import type { ToolDef } from "@/mcp/tools";

const tools: ToolDef[] = [
  {
    name: "list_projects",
    title: "List projects",
    description: "…",
    inputSchema: {},
    async handler() {
      return "- **demo** — Demo";
    },
  },
  {
    name: "explodes",
    title: "Explodes",
    description: "…",
    inputSchema: {},
    async handler() {
      throw new Error("disk on fire");
    },
  },
];

const call = (method: string, params?: unknown, id: string | number | null = 1) =>
  handleJsonRpc(tools, { jsonrpc: "2.0", id, method, params });

describe("handleJsonRpc", () => {
  it("initializes, echoing the client's protocol version", async () => {
    const res = await call("initialize", { protocolVersion: "2024-11-05" });
    const result = res?.result as Record<string, unknown>;

    expect(result.protocolVersion).toBe("2024-11-05");
    expect(result.serverInfo).toMatchObject({ name: "groundwork" });
  });

  it("falls back to a known protocol version when the client sends none", async () => {
    const res = await call("initialize", {});
    const result = res?.result as Record<string, unknown> | undefined;
    expect(result?.protocolVersion).toBe(PROTOCOL_VERSION);
  });

  it("lists tools with a real JSON Schema for their arguments", async () => {
    const res = await handleJsonRpc([{ ...tools[0], inputSchema: { project: z.string() } }], {
      jsonrpc: "2.0",
      id: 1,
      method: "tools/list",
    });

    const result = res?.result as { tools: { inputSchema: Record<string, unknown> }[] } | undefined;
    const schema = result?.tools[0].inputSchema as { properties?: Record<string, unknown> };
    expect(schema.properties).toHaveProperty("project");
  });

  it("calls a tool and wraps its text in a content block", async () => {
    const res = await call("tools/call", { name: "list_projects", arguments: {} });
    expect(res?.result).toEqual({ content: [{ type: "text", text: "- **demo** — Demo" }] });
  });

  it("reports a thrown tool as an isError result, not a transport error", async () => {
    const res = await call("tools/call", { name: "explodes", arguments: {} });
    const result = res?.result as { isError?: boolean; content: { text: string }[] };

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("disk on fire");
    expect(res?.error).toBeUndefined();
  });

  it("rejects an unknown tool", async () => {
    const res = await call("tools/call", { name: "rm_rf", arguments: {} });
    expect(res?.error?.code).toBe(-32602);
  });

  it("rejects an unknown method", async () => {
    expect((await call("tools/destroy"))?.error?.code).toBe(-32601);
  });

  it("returns no body for a notification", async () => {
    expect(await call("notifications/initialized", {}, null)).toBeNull();
  });

  it("survives a garbage message", async () => {
    expect((await handleJsonRpc(tools, "not an object"))?.error?.code).toBe(-32600);
  });
});

describe("checkBearer", () => {
  it("accepts the configured token", () => {
    expect(checkBearer("Bearer s3cret", "s3cret", true)).toEqual({ ok: true, mode: "configured" });
  });

  it("rejects a wrong or missing token", () => {
    expect(checkBearer("Bearer nope", "s3cret", true)).toMatchObject({ ok: false, status: 401 });
    expect(checkBearer(null, "s3cret", true)).toMatchObject({ ok: false, status: 401 });
  });

  it("falls back to the dev token outside production", () => {
    expect(checkBearer(`Bearer ${DEV_TOKEN}`, undefined, false)).toEqual({ ok: true, mode: "dev" });
  });

  /** A well-known default password reachable from the internet fails silently. */
  it("disables the endpoint in production when no token is configured", () => {
    expect(checkBearer(`Bearer ${DEV_TOKEN}`, undefined, true)).toMatchObject({
      ok: false,
      status: 503,
    });
    expect(checkBearer(`Bearer ${DEV_TOKEN}`, "   ", true)).toMatchObject({ status: 503 });
  });
});
