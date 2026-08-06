#!/usr/bin/env bun
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { createFilesystemSource } from "@/lib/content/filesystem-source";
import { createGroundworkTools } from "@/mcp/tools";

/**
 * Groundwork's local MCP server (G3 / ADR-0006).
 *
 * A standalone bun process, deliberately NOT a Next route: the stdio transport
 * owns the process's stdin/stdout for the life of the session, which no request
 * handler can offer. It reads `PROJECT_ROOTS` straight from the environment
 * rather than through `serverEnv()`, because that module is `server-only` —
 * a Next marker that has no meaning out here.
 *
 * Read-only by construction: the tools are typed against a narrowed source
 * (see `ReadOnlySource`), so no amount of prompting reaches a write.
 *
 * Connect it with:
 *   claude mcp add groundwork -- bun run /abs/path/to/groundwork/src/mcp/server.ts
 */
async function main(): Promise<void> {
  const roots = (process.env.PROJECT_ROOTS ?? "")
    .split(",")
    .map((r) => r.trim())
    .filter(Boolean);

  if (roots.length === 0) {
    // stderr, never stdout — stdout is the JSON-RPC channel.
    console.error(
      "groundwork-mcp: PROJECT_ROOTS is empty; no projects will be visible.\n" +
        'Set PROJECT_ROOTS="/abs/path/to/repo-a,/abs/path/to/repo-b".',
    );
  }

  const server = new McpServer({ name: "groundwork", version: "0.2.0" });

  for (const tool of createGroundworkTools(createFilesystemSource(roots))) {
    server.registerTool(
      tool.name,
      {
        title: tool.title,
        description: tool.description,
        inputSchema: tool.inputSchema,
        annotations: { readOnlyHint: true, openWorldHint: false },
      },
      async (args: Record<string, unknown>) => ({
        content: [{ type: "text" as const, text: await tool.handler(args ?? {}) }],
      }),
    );
  }

  await server.connect(new StdioServerTransport());
  console.error(`groundwork-mcp: ready over stdio (${roots.length} root(s))`);
}

main().catch((error: unknown) => {
  console.error("groundwork-mcp: fatal", error);
  process.exit(1);
});
