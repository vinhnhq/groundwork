import { expect, test } from "@playwright/test";
import { signInAs } from "./helpers";

test("an unsigned-in visitor is sent to sign-in", async ({ page }) => {
  await page.goto("/ops");
  await expect(page).toHaveURL(/\/sign-in/);
});

/**
 * The reason sessions are signed at all: without it, typing a cookie is a
 * privilege escalation.
 */
test("a forged session cookie is rejected and cleared", async ({ page, context }) => {
  await context.addCookies([
    { name: "gw_session", value: "totally.forged", url: "http://localhost:3100" },
  ]);

  await page.goto("/ops");
  await expect(page).toHaveURL(/\/sign-in/);
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
  await expect(page.getByTestId("status-control-S1.1")).toBeVisible();

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
