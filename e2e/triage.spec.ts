import { expect, test } from "@playwright/test";
import { signInAs } from "./helpers";

test.beforeEach(async ({ page }) => {
  await signInAs(page);
});

test("triage: analyze an idea, ground it to READY, accept → backlog block", async ({ page }) => {
  await page.goto("/ops/sample/triage");

  await page
    .getByLabel("Client idea")
    .fill("Export monthly revenue reports as downloadable spreadsheets");
  await page.getByRole("button", { name: /analyze against docs/i }).click();

  // The agent proposes a draft; it starts NOT ready (boundaries/oracle missing).
  const status = page.getByTestId("dor-status");
  await expect(status).toContainText(/missing/i);
  await expect(page.getByRole("button", { name: /accept/i })).toBeDisabled();

  // Human grounds the ticket.
  await page.getByLabel("Touches (comma-separated)").fill("src/reports");
  await page.getByLabel("Must NOT (comma-separated)").fill("src/db");
  await page.getByLabel(/Oracle/).fill("an e2e exports a valid spreadsheet");
  await page.getByLabel(/Evidence/).fill("spec-reports, ADR-0001");
  await page.getByLabel("Escalate if").fill("export format unclear");

  // DoR flips to READY and Accept enables.
  await expect(status).toContainText("READY");
  await page.getByRole("button", { name: /accept/i }).click();

  await expect(page.getByText(/Would append to sample/)).toBeVisible();
  await expect(page.getByText(/\*\*NEW\*\* Export monthly revenue/)).toBeVisible();
});

/**
 * The triage surface is a conversation: your idea and the agent's verdict as
 * messages, the docs it read as attachments, and a file-tagger so you can point
 * it at the files you know are relevant.
 */
test("triage renders as a message thread and tagging a file steers the verdict", async ({
  page,
}) => {
  await page.goto("/ops/sample/triage");

  // Nothing sent: the composer is the page, no empty transcript above it.
  await expect(page.locator('[data-slot="message"]')).toHaveCount(0);

  /**
   * `@` opens a menu at the caret, navigable from the keyboard with the caret
   * still in the field — the point of an inline mention is that you never stop
   * typing.
   */
  const input = page.getByLabel("Client idea");
  await input.click();
  await page.keyboard.type("Add a colour picker to the avatar editor @sample");

  const menu = page.getByTestId("doc-mention");
  await expect(menu).toBeVisible();
  // Typing after the @ filters.
  expect(await menu.getByRole("option").count()).toBeGreaterThan(0);
  // And focus never left the textarea.
  expect(await page.evaluate(() => document.activeElement?.id)).toBe("triage-idea");

  const tagged = (await menu.locator('[aria-selected="true"]').first().textContent())?.trim() ?? "";

  // Enter takes the highlighted option; the whole `@query` becomes its title.
  await page.keyboard.press("Enter");
  await expect(menu).toBeHidden();
  await expect(input).not.toHaveValue(/@sample/);
  await expect(page.locator('[data-slot="attachment"]')).toHaveCount(1);
  await page.getByRole("button", { name: /Analyze against docs/i }).click();

  // Two turns: the idea, then the verdict.
  await expect(page.locator('[data-slot="message"]')).toHaveCount(2);
  await expect(page.locator('[data-slot="bubble"]')).toHaveCount(2);

  // A tagged file is asserted relevant, so it is cited even though the idea's
  // wording does not overlap it — that is what makes tagging worth doing.
  const thread = page.locator('[data-slot="message-scroller-content"]');
  await expect(thread).toContainText("grounded in");
  await expect(thread).toContainText(tagged.replace(/\s+/g, " ").slice(0, 24));

  // And the draft form still follows, with the tag carried into Evidence.
  await expect(page.getByTestId("dor-status")).toBeVisible();
});

/** The @ menu is a keyboard surface first — a mouse is optional. */
test("the @ menu navigates and closes from the keyboard", async ({ page }) => {
  await page.goto("/ops/sample/triage");

  const input = page.getByLabel("Client idea");
  await input.click();
  await page.keyboard.type("@");

  const menu = page.getByTestId("doc-mention");
  await expect(menu).toBeVisible();

  const active = () => menu.locator('[aria-selected="true"]').first();
  const first = (await active().textContent())?.trim();

  // Arrows move the highlight and wrap rather than dead-ending.
  await page.keyboard.press("ArrowDown");
  expect((await active().textContent())?.trim()).not.toBe(first);
  await page.keyboard.press("ArrowUp");
  expect((await active().textContent())?.trim()).toBe(first);
  await page.keyboard.press("ArrowUp");
  expect((await active().textContent())?.trim()).not.toBe(first);

  // Escape closes it and leaves the text alone.
  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
  await expect(input).toHaveValue("@");

  // Backspacing the @ away must not reopen it.
  await page.keyboard.press("Backspace");
  await expect(menu).toBeHidden();
});

/** Browsing by folder is still there for when you do not know the file's name. */
test("Browse files opens the folder tree", async ({ page }) => {
  await page.goto("/ops/sample/triage");

  await page.getByRole("button", { name: /Browse files/ }).click();
  const picker = page.getByTestId("doc-picker");
  await expect(picker).toBeVisible();
  await expect(picker.getByRole("button", { name: /decisions/ })).toBeVisible();

  await picker.getByRole("button", { name: /Sample decision/ }).click();
  await expect(page.locator('[data-slot="attachment"]')).toHaveCount(1);
});

/**
 * The @ menu is a folder tree you walk, not a flat dump: pick the parent, then
 * the child. Typing switches it to a flat search across everything, because
 * searching and browsing are different intents.
 */
test("the @ menu walks folders parent-then-child", async ({ page }) => {
  await page.goto("/ops/sample/triage");

  const input = page.getByLabel("Client idea");
  await input.click();
  await page.keyboard.type("@");

  const menu = page.getByTestId("doc-mention");
  await expect(menu).toBeVisible();

  // The root level is folders, and no file is on screen yet.
  const folders = menu.locator('[data-row-type="folder"]');
  expect(await folders.count()).toBeGreaterThan(0);
  await expect(menu.getByRole("option", { name: /Sample decision/ })).toHaveCount(0);

  // Enter descends into the highlighted folder; a breadcrumb appears.
  await page.keyboard.press("Enter");
  await expect(menu.locator('[data-row-type="folder"]').first()).toBeVisible();

  // ArrowRight descends again, into decisions, where the files live.
  await page.keyboard.press("ArrowRight");
  await expect(menu.getByRole("option", { name: /Sample decision/ })).toBeVisible();

  // ArrowLeft climbs back out.
  await page.keyboard.press("ArrowLeft");
  await expect(menu.getByRole("option", { name: /Sample decision/ })).toHaveCount(0);

  // Typing abandons the walk for a flat search.
  await page.keyboard.type("sample");
  await expect(menu.getByRole("option", { name: /Sample decision/ })).toBeVisible();
  await expect(menu.locator('[data-row-type="folder"]')).toHaveCount(0);
});

/**
 * Layout regressions this surface has already had once: the menu clipped by the
 * card's `overflow-hidden`, and `scrollIntoView` dragging the composer around as
 * the arrows walked the list.
 */
test("the composer stays at the bottom and the menu is never clipped", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 860 });
  await page.goto("/ops/sample/triage");

  // Wait for the field before measuring: an unlaid-out card reports a zero rect,
  // which reads as "pinned to the very top" and fails for the wrong reason.
  const input = page.getByLabel("Client idea");
  await expect(input).toBeVisible();

  const composer = page.locator('[data-slot="card"]').first();
  await expect
    .poll(() => composer.evaluate((el) => window.innerHeight - el.getBoundingClientRect().bottom))
    .toBeLessThan(80);

  await input.click();
  await page.keyboard.type("@");

  const menu = page.getByTestId("doc-mention");
  await expect(menu).toBeVisible();

  // Full width — a clipped menu measured narrower than its own 20rem.
  const shell = await menu.evaluate((el) => {
    const r = (el.parentElement as HTMLElement).getBoundingClientRect();
    return { width: Math.round(r.width), top: Math.round(r.top), bottom: Math.round(r.bottom) };
  });
  expect(shell.width).toBeGreaterThan(300);
  expect(shell.top).toBeGreaterThanOrEqual(0);
  expect(shell.bottom).toBeLessThanOrEqual(860);

  // Arrows must not move the composer.
  const before = await composer.evaluate((el) => Math.round(el.getBoundingClientRect().top));
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  expect(await composer.evaluate((el) => Math.round(el.getBoundingClientRect().top))).toBe(before);
});
