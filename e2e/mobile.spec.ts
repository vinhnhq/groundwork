import { devices, expect, test } from "@playwright/test";
import { signInAs, visible } from "./helpers";

/**
 * Everything below runs at phone width — the app is meant to be mobile-first.
 *
 * Pixel 7 rather than an iPhone profile: the iPhone devices are WebKit
 * profiles, and driving one through the Chromium project silently breaks
 * cookie storage, so every test fails at the session rather than at the layout
 * it is meant to check.
 */
test.use({ ...devices["Pixel 7"] });

test.beforeEach(async ({ page }) => {
  await signInAs(page);
});

test("no surface scrolls sideways on a phone", async ({ page }) => {
  const routes = [
    "/ops",
    "/ops/sample",
    "/ops/sample/docs",
    "/ops/sample/tasks",
    "/ops/sample/grounding",
    "/ops/integrations",
  ];

  for (const route of routes) {
    await page.goto(route);
    await page.waitForLoadState("networkidle");

    // A horizontally scrolling body is the classic mobile-layout failure: it
    // hides content with no affordance saying it is there.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `${route} overflows horizontally by ${overflow}px`).toBeLessThanOrEqual(1);
  }
});

test("the task list becomes cards, not a squeezed table", async ({ page }) => {
  await page.goto("/ops/sample/tasks");

  // Streaming can leave a second, hidden copy in the DOM mid-navigation, so
  // assert on the visible one.
  await expect(visible(page, "task-cards")).toBeVisible();
  await expect(page.getByRole("table")).toHaveCount(0);

  // The controls are still there, just stacked.
  await expect(visible(page, "status-control-S1.1")).toBeVisible();
});

test("the project nav is reachable behind the sidebar trigger", async ({ page }) => {
  await page.goto("/ops/sample");

  // Collapsed on a phone: the nav is mounted but off-screen behind the
  // trigger, rather than eating the viewport. Matched by href and :visible —
  // streaming can leave a second, hidden copy of the tree in the DOM, which
  // makes .first() a coin flip.
  // The sidebar only knows it is on a phone once `useIsMobile` resolves, so
  // the desktop column is server-rendered and swapped out on hydration. Wait
  // on that swap rather than polling a timeout: `sidebar-container` is the
  // desktop-only wrapper, so its removal IS the signal mobile mode took over.
  await page.locator('[data-slot="sidebar-container"]').waitFor({ state: "detached" });

  // Scoped to the sidebar: the Overview page also links to Docs from a card,
  // and an unscoped href match counts that as "the nav is showing".
  const navDocsLink = page.locator('[data-slot="sidebar"] a[href$="/docs"]:visible');
  await expect(navDocsLink).toHaveCount(0);

  await page.locator('[data-sidebar="trigger"]:visible').click();
  await expect(navDocsLink.first()).toBeVisible();
});

test("capture opens a drawer with the form in it", async ({ page }) => {
  await page.goto("/ops/sample/tasks");

  await visible(page, "open-capture").click();
  const drawer = visible(page, "capture");
  await expect(drawer).toBeVisible();

  await drawer.getByLabel("Task ID").fill("M1.1");
  await drawer.getByLabel("Title").fill("Captured on a phone");
  await expect(visible(page, "capture-dor")).toContainText("DRAFT");

  await visible(page, "submit-capture").click();
  await expect(visible(page, "write-outcome")).toContainText("Proposed");
});
