import { expect, test } from "@playwright/test";

import { signInAs } from "./helpers";

test.beforeEach(async ({ page }) => {
  await signInAs(page);
});

test("ops home is a project directory and nothing else", async ({ page }) => {
  await page.goto("/ops");

  // The configured project shows AS A LINK — the entry point being activatable
  // is the point of the page, so the role is the assertion (Q6).
  await expect(page.getByRole("link", { name: /Sample Project/ })).toBeVisible();
  await expect(page.getByText(/unconfigured/i)).toBeVisible();

  // The cross-project queues used to live here and now do not — per-project
  // work belongs in that project's workspace.
  await expect(page.getByTestId("ready-queue")).toHaveCount(0);
  await expect(page.getByTestId("draft-list")).toHaveCount(0);
});

test("a project opens into the workspace, with its sections in the sidebar", async ({ page }) => {
  await page.goto("/ops");
  await page.getByRole("link", { name: /Sample Project/ }).click();
  await expect(page).toHaveURL(/\/ops\/sample$/);

  const nav = page.getByRole("navigation").first();
  for (const section of ["Overview", "Docs", "Tasks", "Grounding"]) {
    await expect(page.getByRole("link", { name: section }).first()).toBeVisible();
  }
  await expect(nav).toBeVisible();
});

test("Tasks lists the backlog with its readiness", async ({ page }) => {
  await page.goto("/ops/sample/tasks");

  const row = page.getByRole("row").filter({ hasText: "S1.1" });
  await expect(row).toContainText("ready");

  // S1.2 lacks four DoR fields → compact count, detail in the tooltip.
  const draftRow = page.getByRole("row").filter({ hasText: "S1.2" });
  const gaps = draftRow.getByText(/DoR fields missing/);
  await expect(gaps).toBeVisible();
  await expect(gaps).toHaveAttribute("title", /Oracle/);
});

test("open a doc from the sidebar tree and render its image", async ({ page }) => {
  await page.goto("/ops/sample/docs");

  // At desktop width the tree lives in the SIDEBAR and the pane on the right is
  // where the document lands — the page-level tree is the phone fallback.
  //
  // Folders start closed and open one level at a time, so the path has to be
  // walked rather than assumed open.
  const tree = page.getByTestId("doc-tree-nav");
  await tree.getByRole("button", { name: /^docs/ }).click();
  await tree.getByRole("button", { name: /decisions/ }).click();
  await tree.getByRole("link", { name: /Sample decision/ }).click();
  await expect(page.getByRole("heading", { name: /Sample decision/ })).toBeVisible();

  // The relative image resolves through the asset route and actually loads.
  // The doc's folder is derived from its own relPath now, not a kind→dir table,
  // so this also pins that a doc outside the three legacy folders would resolve.
  const img = page.locator("article img").first();
  await expect(img).toBeVisible();
  await expect
    .poll(() => img.evaluate((el: HTMLImageElement) => el.naturalWidth))
    .toBeGreaterThan(0);
});

/**
 * The tree mirrors the repo's folders. Before W2 the source scanned three fixed
 * paths, so any Markdown outside them — `architecture.md` and `tech-standards.md`
 * in the real repo — was invisible to the console that tells agents to read it.
 */
test("the Docs tree mirrors __project__ and reaches files outside the legacy folders", async ({
  page,
}) => {
  await page.goto("/ops/sample/docs");
  const tree = page.getByTestId("doc-tree-nav");

  // Top-level folders from the fixture repo, as folder rows rather than links.
  await expect(tree.getByRole("button", { name: /^docs/ })).toBeVisible();
  await expect(tree.getByRole("button", { name: /^specs/ })).toBeVisible();
  await expect(tree.getByRole("button", { name: /^tasks/ })).toBeVisible();

  // Closed by default: no documents on screen until a folder is opened.
  expect(await tree.getByRole("link").count()).toBe(0);

  // Opening one reveals its immediate children — and `decisions` stays CLOSED,
  // which is the whole point: one level at a time, not the entire subtree.
  await tree.getByRole("button", { name: /^docs/ }).click();
  await expect(tree.getByRole("button", { name: /decisions/ })).toBeVisible();
  await expect(tree.getByRole("link", { name: /Sample decision/ })).toBeHidden();

  const afterDocs = await tree.getByRole("link").count();
  await tree.getByRole("button", { name: /decisions/ }).click();
  expect(await tree.getByRole("link").count()).toBeGreaterThan(afterDocs);

  // `tasks/backlog.md` sits outside adr/spec/retro and is reachable as a `doc`.
  await tree.getByRole("button", { name: /^tasks/ }).click();
  const backlog = tree.getByRole("link", { name: /Backlog/i });
  await expect(backlog).toBeVisible();
  await expect(backlog).toHaveAttribute("href", /\/doc\/tasks\/backlog$/);

  // Closing it hides them again.
  await tree.getByRole("button", { name: /^tasks/ }).click();
  await expect(backlog).toBeHidden();
});

/**
 * Master-detail: the tree stays in the sidebar while the document occupies the
 * pane. It is built in the project LAYOUT, so React keeps it mounted across doc
 * navigations — that is what makes a collapsed folder stay collapsed as you read.
 */
test("the sidebar tree persists across documents and marks the open one", async ({ page }) => {
  await page.goto("/ops/sample/docs");
  const tree = page.getByTestId("doc-tree-nav");

  // The index pane invites a choice rather than repeating the tree.
  await expect(page.getByText("Pick a document")).toBeVisible();

  await tree.getByRole("button", { name: /^docs/ }).click();
  await tree.getByRole("button", { name: /decisions/ }).click();
  await tree.getByRole("link", { name: /Sample decision/ }).click();
  await expect(page.getByRole("heading", { name: /Sample decision/ })).toBeVisible();

  // Still there, and the open document is the current one.
  await expect(tree).toBeVisible();
  await expect(tree.locator('[aria-current="page"]')).toContainText("Sample decision");

  /**
   * The folders on the path to the open document are expanded for you — that is
   * what makes the tree orient you rather than needing a re-walk on every visit.
   */
  await page.goto("/ops/sample/doc/tasks/backlog");
  await expect(
    page.getByTestId("doc-tree-nav").getByRole("link", { name: /Backlog/i }),
  ).toBeVisible();
  await expect(page.getByTestId("doc-tree-nav").locator('[aria-current="page"]')).toContainText(
    "Backlog",
  );
});

/** Every ADR/spec URL minted before the tree existed must still resolve. */
test("pre-tree document URLs still resolve", async ({ page }) => {
  for (const path of ["/ops/sample/adr/0001-sample", "/ops/sample/spec/v1-foo"]) {
    const res = await page.request.get(path);
    expect(res.status(), path).toBe(200);
  }
});

/**
 * The board answers "what is in flight" where the table answers "what is the
 * state of everything". Both filter through the same row in `TasksView`, so the
 * counts must agree — a drift there would mean each view grew its own filter.
 */
test("tasks switch between table and board, and the choice sticks", async ({ page }) => {
  await page.goto("/ops/sample/tasks");

  const rows = await page.locator("tbody tr").count();

  await page.getByTestId("view-board").click();
  const board = page.getByTestId("task-board");
  await expect(board).toBeVisible();
  await expect(board.locator("section")).toHaveCount(5);
  expect(await board.locator('[data-slot="card"]').count()).toBe(rows);

  // The board's column track is wider than the viewport; it must scroll inside
  // itself. Before `min-w-0` on the inset it grew the page instead.
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
    "the board must not scroll the page sideways",
  ).toBe(true);

  await page.reload();
  await expect(page.getByTestId("task-board")).toBeVisible();

  await page.getByTestId("view-table").click();
  await expect(page.locator("tbody tr").first()).toBeVisible();
});
