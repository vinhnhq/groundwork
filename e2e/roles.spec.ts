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

test("the engineer sees the whole console", async ({ page }) => {
  await signInAs(page, "engineer");

  await expect(page.getByTestId("whoami")).toContainText("Engineer");
  await expect(page.getByRole("link", { name: "Integrations" })).toBeVisible();

  await page.goto("/ops/sample");
  await expect(page.getByRole("link", { name: /Triage an idea/ })).toBeVisible();
  await expect(page.getByTestId("open-capture")).toBeVisible();
});

test("the PM gets the board and grounding, but not the agent or integrations", async ({ page }) => {
  await signInAs(page, "pm");

  await expect(page.getByTestId("whoami")).toContainText("PM");
  await expect(page.getByRole("link", { name: "Integrations" })).toHaveCount(0);

  await page.goto("/ops/sample");
  await expect(page.getByTestId("open-capture")).toBeVisible();
  await expect(page.getByTestId("grounding")).toBeVisible();

  // Hiding the link is not the control — the route itself must refuse.
  await page.goto("/ops/sample/triage");
  await expect(page).toHaveURL(/\/ops\?denied=agent.run/);
});

test("QA can move a task but cannot reach integrations", async ({ page }) => {
  await signInAs(page, "qa");

  await page.goto("/ops/sample");
  await expect(page.getByTestId("status-control-S1.1")).toBeVisible();

  await page.goto("/ops/integrations");
  await expect(page).toHaveURL(/\/ops\?denied=integrations.view/);
});

test("a client can read but not write", async ({ page }) => {
  await signInAs(page, "client");

  await page.goto("/ops/sample");
  await expect(page.getByRole("heading", { name: "Sample Project" })).toBeVisible();

  // No write affordances at all for a read-only role.
  await expect(page.getByTestId("open-capture")).toHaveCount(0);
  await expect(page.getByTestId("status-control-S1.1")).toHaveCount(0);
});
