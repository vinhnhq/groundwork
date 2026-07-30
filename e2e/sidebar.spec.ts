import { expect, test } from "@playwright/test";
import { signInAs } from "./helpers";

const widthOf = (page: import("@playwright/test").Page) =>
  page.evaluate(() =>
    Number(
      getComputedStyle(document.querySelector('[data-slot="sidebar-wrapper"]') as Element)
        .getPropertyValue("--sidebar-width")
        .replace("px", ""),
    ),
  );

test.describe("the project sidebar", () => {
  /**
   * Grouped by capability, so the headings explain why a client sees fewer rows
   * than the engineer instead of leaving it to be inferred. A group whose items
   * a role cannot use is absent, not disabled.
   */
  test("groups nav by ability, and a role only sees the groups it can use", async ({ page }) => {
    await signInAs(page, "engineer");
    await page.goto("/ops/sample/docs");

    const labels = page.locator('[data-slot="sidebar-group-label"]');
    await expect(labels).toHaveText(["Workspace", "Grounding", "Agent"]);

    // A client has neither grounding.read nor agent.run.
    await signInAs(page, "client");
    await page.goto("/ops/sample");
    await expect(page.locator('[data-slot="sidebar-group-label"]')).toHaveText(["Workspace"]);

    // PM grounds but does not drive the agent.
    await signInAs(page, "pm");
    await page.goto("/ops/sample");
    await expect(page.locator('[data-slot="sidebar-group-label"]')).toHaveText([
      "Workspace",
      "Grounding",
    ]);
  });

  /** The tree belongs to its menu row, not to a panel of its own. */
  test("nests the docs tree inside the Docs menu row", async ({ page }) => {
    await signInAs(page, "engineer");
    await page.goto("/ops/sample/docs");

    const docsRow = page.getByRole("link", { name: "Docs", exact: true });
    const tree = page.getByTestId("doc-tree-nav");
    await expect(tree).toBeVisible();
    // Folders start closed, so open one to have a row to reach for.
    await tree.getByRole("button", { name: /^docs/ }).click();
    await tree.getByRole("button", { name: /decisions/ }).click();

    // Same list item: the tree is a descendant of the row's <li>, and Tasks
    // still follows it in the menu rather than being pushed below a panel.
    const sameItem = await tree.evaluate(
      (el, rowText) => el.closest("li")?.textContent?.includes(rowText) ?? false,
      "Docs",
    );
    expect(sameItem, "the tree must live in the Docs menu item").toBe(true);
    await expect(docsRow).toBeVisible();
    await expect(page.getByRole("link", { name: "Tasks" })).toBeVisible();

    // It follows you into a document rather than vanishing at the section root.
    await tree.getByRole("link", { name: /Sample decision/ }).click();
    await expect(page.getByTestId("doc-tree-nav")).toBeVisible();
  });

  test("resizes by drag and remembers the width", async ({ page }) => {
    await signInAs(page, "engineer");
    await page.goto("/ops/sample/docs");

    const handle = page.getByRole("separator", { name: "Resize sidebar" });
    await expect(handle).toBeVisible();
    const before = await widthOf(page);

    const box = await handle.boundingBox();
    if (!box) throw new Error("no handle");
    await page.mouse.move(box.x + box.width / 2, box.y + 200);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 100, box.y + 200, { steps: 10 });
    await page.mouse.up();

    const after = await widthOf(page);
    expect(after).toBeGreaterThan(before);

    // Polled, not read once: the stored width is adopted in an effect after
    // mount (reading localStorage during render would be a hydration mismatch),
    // so there is one frame at the default before it settles.
    await page.reload();
    await expect.poll(() => widthOf(page)).toBe(after);
  });

  /** A drag-only control is unreachable without a pointer. */
  test("resizes by keyboard and clamps at its bounds", async ({ page }) => {
    await signInAs(page, "engineer");
    await page.goto("/ops/sample/docs");

    const handle = page.getByRole("separator", { name: "Resize sidebar" });
    await handle.focus();

    await page.keyboard.press("Home");
    const base = await widthOf(page);

    await page.keyboard.press("ArrowRight");
    expect(await widthOf(page)).toBe(base + 8);
    await page.keyboard.press("Shift+ArrowRight");
    expect(await widthOf(page)).toBe(base + 40);

    // Well past the lower bound — it must stop, not invert the layout.
    for (let i = 0; i < 20; i++) await page.keyboard.press("Shift+ArrowLeft");
    const min = Number(await handle.getAttribute("aria-valuemin"));
    expect(await widthOf(page)).toBe(min);

    await page.keyboard.press("Home");
    expect(await widthOf(page)).toBe(base);
  });

  test("collapsing to icons hides both the tree and the resizer", async ({ page }) => {
    await signInAs(page, "engineer");
    await page.goto("/ops/sample/docs");
    await expect(page.getByTestId("doc-tree-nav")).toBeVisible();

    await page.getByRole("button", { name: /Toggle Sidebar/i }).click();

    // Neither has an icon-only form; squeezing them into 3rem reads as breakage.
    await expect(page.getByTestId("doc-tree-nav")).toBeHidden();
    await expect(page.getByRole("separator", { name: "Resize sidebar" })).toBeHidden();
  });
});

/**
 * Chrome placement: the header carries where-you-are plus the two global
 * actions, and the sidebar's foot carries who-you-are plus the way out. Identity
 * is ambient context rather than an action, and "All projects" at the top made
 * the first thing you read a way *out* of the project you had just opened.
 */
test.describe("chrome placement", () => {
  test("the header is only breadcrumb, theme and sign out", async ({ page }) => {
    await signInAs(page, "engineer");
    await page.goto("/ops/sample/docs");

    const header = page.locator("header").first();
    await expect(header.getByRole("button", { name: "Sign out" })).toBeVisible();
    await expect(header).toContainText("Sample Project");

    // The profile and the way out are NOT up here any more.
    await expect(header.getByTestId("whoami")).toHaveCount(0);
    await expect(header.getByRole("link", { name: "All projects" })).toHaveCount(0);
  });

  test("the sidebar shows the project name at the top, identity and exit at the foot", async ({
    page,
  }) => {
    await signInAs(page, "engineer");
    await page.goto("/ops/sample/docs");

    // Top: the project name and nothing else.
    await expect(page.locator('[data-slot="sidebar-header"]')).toHaveText("Sample Project");

    const footer = page.locator('[data-slot="sidebar-footer"]');
    await expect(footer.getByTestId("whoami")).toContainText("Engineer");
    await expect(footer.getByRole("link", { name: "All projects" })).toBeVisible();

    // And it goes where it says.
    await footer.getByRole("link", { name: "All projects" }).click();
    await expect(page).toHaveURL(/\/ops$/);
  });

  /** The resize affordance is visible at rest, not only on hover. */
  test("the resizer shows a grab handle without hovering", async ({ page }) => {
    await signInAs(page, "engineer");
    await page.goto("/ops/sample/docs");

    const pill = await page
      .getByRole("separator", { name: "Resize sidebar" })
      .evaluate((el) => {
        const cs = getComputedStyle(el, "::after");
        return { height: cs.height, width: cs.width, alpha: cs.backgroundColor };
      });

    // A short centred pill, painted before any pointer arrives.
    expect(Number.parseFloat(pill.height)).toBeGreaterThan(16);
    expect(Number.parseFloat(pill.width)).toBeLessThanOrEqual(6);
    expect(pill.alpha).not.toBe("rgba(0, 0, 0, 0)");
  });
});

/**
 * The sidebar overlays below 1024 rather than shadcn's default 768.
 *
 * A portrait tablet (768–834) was the case that mattered: the sidebar held its
 * full 256px there, leaving the triage composer ~470px of an ~800px screen — a
 * cramped column beside a nav you were not using.
 */
test.describe("tablet chrome", () => {
  test("a portrait tablet gets the conversation, not a cramped column", async ({ page }) => {
    await page.setViewportSize({ width: 820, height: 1180 });
    await signInAs(page, "engineer");
    await page.goto("/ops/sample/triage");

    // No persistent sidebar column at this width.
    await expect(page.locator('[data-slot="sidebar-container"]')).toHaveCount(0);

    // The composer gets the full reading column instead of what is left over.
    const width = await page
      .locator('[data-slot="card"]')
      .first()
      .evaluate((el) => Math.round(el.getBoundingClientRect().width));
    expect(width).toBeGreaterThan(700);

    // And the nav is still reachable.
    await page.getByRole("button", { name: /Toggle Sidebar/i }).click();
    await expect(page.getByRole("link", { name: "All projects" })).toBeVisible();
  });

  test("a landscape tablet keeps the persistent sidebar", async ({ page }) => {
    await page.setViewportSize({ width: 1194, height: 834 });
    await signInAs(page, "engineer");
    await page.goto("/ops/sample/triage");

    await expect(page.locator('[data-slot="sidebar-container"]')).toBeVisible();
  });
});
