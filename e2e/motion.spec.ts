import { expect, test } from "@playwright/test";
import { signInAs } from "./helpers";

/**
 * Motion must be a decoration, never a dependency.
 *
 * `globals.css` caps `animation-duration`/`transition-duration` under
 * `prefers-reduced-motion`, but Motion drives values with `requestAnimationFrame`
 * rather than CSS transitions and would sail straight past that override — so
 * `Reveal` checks `useReducedMotion` in JS and renders a plain element instead.
 * These tests pin both halves: that the animation exists, and that asking for
 * reduced motion removes it rather than merely speeding it up.
 */
test.describe("reduced motion", () => {
  test("no surface animates, and every surface still works", async ({ page }) => {
    // `emulateMedia` rather than a `test.use` option: it is explicit about what
    // is being emulated and portable across Playwright versions.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await signInAs(page, "engineer");

    await page.goto("/ops/sample");
    // The cockpit's Reveal wrapper renders as a plain div — no inline style.
    await expect(page.getByText("Ready to build")).toBeVisible();

    await page.goto("/ops/sample/tasks");
    await page.getByTestId("view-board").click();
    const column = page.getByTestId("board-column-todo");
    await expect(column).toBeVisible();

    const inlineStyle = await column.evaluate(
      (el) => el.parentElement?.getAttribute("style") ?? "",
    );
    expect(inlineStyle, "reduced motion must not leave Motion's inline transform").toBe("");

    // Content is fully opaque immediately, not faded in.
    await expect.poll(() => column.evaluate((el) => Number(getComputedStyle(el).opacity))).toBe(1);
  });
});

test.describe("motion enabled", () => {
  test("revealed surfaces settle fully visible", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await signInAs(page, "engineer");
    await page.goto("/ops/sample/tasks");
    await page.getByTestId("view-board").click();

    const column = page.getByTestId("board-column-todo");
    await expect(column).toBeVisible();

    // Whatever the entrance does, it must end at full opacity — an animation
    // that strands content at 0 is indistinguishable from a broken page.
    await expect
      .poll(() => column.evaluate((el) => Number(getComputedStyle(el.parentElement!).opacity)))
      .toBe(1);
  });
});
