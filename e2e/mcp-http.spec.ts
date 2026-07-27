import { expect, test } from "@playwright/test";
import { signInAs } from "./helpers";

// Matches playwright.config.ts. `next start` is production, where the
// dev-token fallback is refused outright — so this exercises the real path.
const TOKEN = "e2e-mcp-token";
const rpc = (method: string, params?: unknown) => ({ jsonrpc: "2.0", id: 1, method, params });

// No sign-in here on purpose: the remote door is token-gated, not cookie-gated.
test("the remote MCP endpoint refuses an unauthenticated caller", async ({ request }) => {
  const res = await request.post("/api/mcp", { data: rpc("tools/list") });
  expect(res.status()).toBe(401);
});

test("a bearer token unlocks the same four read tools", async ({ request }) => {
  const res = await request.post("/api/mcp", {
    headers: { authorization: `Bearer ${TOKEN}` },
    data: rpc("tools/list"),
  });

  expect(res.status()).toBe(200);
  const body = await res.json();
  const names = (body.result.tools as { name: string }[]).map((t) => t.name).sort();
  expect(names).toEqual(["get_doc", "get_project_context", "list_projects", "ready_tasks"]);
});

test("tools/call over HTTP returns the same digest as the paste door", async ({ page }) => {
  const res = await page.request.post("/api/mcp", {
    headers: { authorization: `Bearer ${TOKEN}` },
    data: rpc("tools/call", { name: "get_project_context", arguments: { project: "sample" } }),
  });
  const digest = (await res.json()).result.content[0].text as string;

  // The paste door lives under /ops, which is cookie-gated — so this half needs
  // a session, unlike the token-gated MCP door above. Two different gates, one
  // digest behind them.
  await signInAs(page);

  const exported = await (await page.request.get("/ops/sample/context.md")).text();

  // Three doors, one digest (ADR-0004/0006).
  expect(digest).toEqual(exported);
});

test("a notification gets 202 and no body", async ({ request }) => {
  const res = await request.post("/api/mcp", {
    headers: { authorization: `Bearer ${TOKEN}` },
    data: { jsonrpc: "2.0", method: "notifications/initialized" },
  });

  expect(res.status()).toBe(202);
  expect(await res.text()).toBe("");
});
