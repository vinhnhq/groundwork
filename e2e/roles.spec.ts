import { expect, test } from "@playwright/test";
import { DEV_SESSION_SECRET, signInAs, signWith, visible } from "./helpers";

test("an unsigned-in visitor is sent to sign-in", async ({ page }) => {
  await page.goto("/ops");
  await expect(page).toHaveURL(/\/sign-in/);
});

test("a garbage session cookie is rejected", async ({ page, context }) => {
  await context.addCookies([
    { name: "gw_session", value: "totally.forged", url: "http://localhost:3100" },
  ]);

  await page.goto("/ops");
  await expect(page).toHaveURL(/\/sign-in/);
});

/**
 * The threat the signature actually defends against: a *validly signed* token
 * minted with the published dev secret, claiming the engineer role.
 *
 * The previous version of this test passed a garbage string, which the parser
 * rejects before any signature check — so it never exercised the secret at all
 * and would have stayed green while a real forgery worked.
 */
test("a cookie signed with the published dev secret is rejected", async ({ page, context }) => {
  const forged = await signWith(DEV_SESSION_SECRET, {
    sub: "attacker",
    email: "attacker@example.com",
    name: "Attacker",
    role: "engineer",
    exp: Math.floor(Date.now() / 1000) + 3600,
  });

  await context.addCookies([{ name: "gw_session", value: forged, url: "http://localhost:3100" }]);

  await page.goto("/ops");
  await expect(page).toHaveURL(/\/sign-in/);

  // And it must not open the doors the engineer role would.
  const digest = await page.request.get("/ops/sample/context.md", { maxRedirects: 0 });
  expect([302, 303, 307, 308, 403]).toContain(digest.status());
});

test("the engineer sees every section", async ({ page }) => {
  await signInAs(page, "engineer");

  await expect(page.getByTestId("whoami")).toContainText("Engineer");
  await expect(page.getByRole("link", { name: "Integrations" })).toBeVisible();

  await page.goto("/ops/sample");
  for (const section of ["Docs", "Tasks", "Grounding", "Triage"]) {
    await expect(page.getByRole("link", { name: section }).first()).toBeVisible();
  }

  await page.goto("/ops/sample/tasks");
  await expect(page.getByTestId("open-capture")).toBeVisible();
});

test("the PM gets the board and grounding, but not the agent or integrations", async ({ page }) => {
  await signInAs(page, "pm");

  await expect(page.getByTestId("whoami")).toContainText("PM");
  await expect(page.getByRole("link", { name: "Integrations" })).toHaveCount(0);

  await page.goto("/ops/sample");
  await expect(page.getByRole("link", { name: "Grounding" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Triage" })).toHaveCount(0);

  await page.goto("/ops/sample/tasks");
  await expect(page.getByTestId("open-capture")).toBeVisible();

  // Hiding the nav item is not the control — the route itself must refuse.
  await page.goto("/ops/sample/triage");
  await expect(page).toHaveURL(/\/ops\?denied=agent.run/);

  // And the bounce is explained, not silent — otherwise it reads as a bug.
  const notice = page.getByTestId("denied-notice");
  await expect(notice).toBeVisible();
  await expect(notice).toContainText("PM");
  await expect(notice).toContainText("triage agent");
});

test("QA can move a task but cannot reach integrations", async ({ page }) => {
  await signInAs(page, "qa");

  await page.goto("/ops/sample/tasks");
  await expect(visible(page, "status-control-S1.1")).toBeVisible();

  await page.goto("/ops/integrations");
  await expect(page).toHaveURL(/\/ops\?denied=integrations.view/);
});

test("a client can read but not write", async ({ page }) => {
  await signInAs(page, "client");

  await page.goto("/ops/sample");
  await expect(page.getByRole("heading", { name: "Sample Project" })).toBeVisible();

  // Grounding is not even a section for a read-only role.
  await expect(page.getByRole("link", { name: "Grounding" })).toHaveCount(0);

  await page.goto("/ops/sample/tasks");
  await expect(page.getByTestId("open-capture")).toHaveCount(0);
  await expect(page.getByTestId("status-control-S1.1")).toHaveCount(0);
});

/**
 * Hiding the Copy-context button is courtesy; the route is the control. A
 * route-by-route walk as each role found the client could still fetch this.
 */
test("a client cannot fetch the grounding digest by URL", async ({ page }) => {
  await signInAs(page, "client");

  // Without maxRedirects the proxy's redirect is followed and you read /ops's
  // 200 instead of the refusal.
  const direct = await page.request.get("/ops/sample/context.md", { maxRedirects: 0 });
  expect([302, 303, 307, 308, 403]).toContain(direct.status());

  // Whatever the mechanism, the digest must not come back.
  const followed = await page.request.get("/ops/sample/context.md");
  expect(await followed.text()).not.toContain("project brain");

  // Same for the Grounding page itself.
  await page.goto("/ops/sample/grounding");
  await expect(page).toHaveURL(/\/ops\?denied=grounding.read/);
});

test("roles that may ground can still fetch it", async ({ page }) => {
  await signInAs(page, "qa");

  const res = await page.request.get("/ops/sample/context.md");
  expect(res.status()).toBe(200);
  expect(await res.text()).toContain("project brain");
});

/**
 * The asset route reads the filesystem on behalf of a browser request. It used
 * to resolve against the repo root with an octet-stream fallback, so any
 * signed-in role could pull `.env` or `.git/config` through it.
 */
test("the asset route cannot be used to read outside the docs directory", async ({ page }) => {
  await signInAs(page, "client");

  for (const path of [".env", ".git/config", "package.json"]) {
    const res = await page.request.get(`/ops/sample/asset/${path}`, { maxRedirects: 0 });
    expect([403, 404, 415], `${path} was served`).toContain(res.status());
  }

  // Traversal stays rejected.
  const up = await page.request.get("/ops/sample/asset/../../../etc/passwd", { maxRedirects: 0 });
  expect(up.status()).not.toBe(200);
});

test("a legitimate doc image still loads", async ({ page }) => {
  await signInAs(page, "engineer");

  const img = await page.request.get(
    "/ops/sample/asset/__project__/docs/decisions/assets/diagram.png",
  );
  expect(img.status()).toBe(200);
  expect(img.headers()["content-type"]).toBe("image/png");
});
