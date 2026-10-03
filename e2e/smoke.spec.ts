import { expect, type Page, test } from "@playwright/test";

/** Fails a test on any uncaught error or console error. */
function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  return errors;
}

const PAGES = [
  ["home", "", "Plan your next"],
  ["comp tier list", "tierlist/comps", "Comp Tier List"],
  ["champion tier list", "tierlist/champions", "Champion Tier List"],
  ["item tier list", "tierlist/items", "Item Tier List"],
  ["trait tier list", "tierlist/traits", "Trait Tier List"],
  ["augment tier list", "tierlist/augments", "Augment Tier List"],
  ["team builder", "builder", "Team Builder"],
  ["champions", "champions", "Champions"],
  ["items", "items", "Items"],
  ["traits", "traits", "Traits"],
  ["augments", "augments", "Augments"],
  ["little legends", "little-legends", "Little Legends"],
  ["explorer", "explorer", "Explorer"],
  ["patch changes", "tierlist/changes", "Patch Changes"],
  ["compare", "compare", "Compare"],
  ["roll odds", "tools/rolling", "Roll Odds"],
  ["component planner", "tools/components", "Component Planner"],
  ["tier list maker", "tools/tier-list", "Tier List Maker"],
] as const;

for (const [name, path, heading] of PAGES) {
  test(`${name} renders`, async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(heading);
    expect(errors).toEqual([]);
  });
}

test("detail pages render from the database", async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto("champions");
  await page.locator("main button", { hasText: "Ahri" }).first().click();
  await page.getByRole("link", { name: /full stats/i }).click();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  await page.goto("traits");
  await page.locator("main a[href*='/traits/']").first().click();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(errors).toEqual([]);
});

test("the team builder adds, counts and autofills units", async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto("builder");
  // Pool champions are the draggable "Add …" buttons (not "Add a level").
  const pool = page.locator('[aria-roledescription="draggable"][aria-label^="Add "]');
  // Hover first so a hover card is open over the pool: clicks must still land.
  await pool.nth(0).hover();
  await page.waitForTimeout(400);
  await pool.nth(0).click();
  await pool.nth(1).click();
  await expect(page.getByTitle("Level 8 fields up to 8 units")).toContainText("2/8");

  await page.getByRole("button", { name: /^Autofill ·/ }).click();
  await expect(page.getByTitle("Level 8 fields up to 8 units")).toContainText("8/8");
  expect(errors).toEqual([]);
});

test("the team builder saves the board as an image", async ({ page }, testInfo) => {
  await page.goto("builder");
  const pool = page.locator('[aria-roledescription="draggable"][aria-label^="Add "]');
  await pool.nth(0).click();
  await page.getByRole("button", { name: /^Autofill ·/ }).click();
  await page.getByRole("button", { name: "Share" }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("menuitem", { name: /Save as image/ }).click();
  expect((await download).suggestedFilename()).toMatch(/\.png$/);
  await (await download).saveAs(testInfo.outputPath("board.png"));

  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.getByRole("button", { name: "Share" }).click();
  await page.getByRole("menuitem", { name: /Copy image/ }).click();
  await expect(page.getByText("Board image copied.")).toBeVisible();
});

test("the guide editor turns the board into a comp file", async ({ page }) => {
  await page.goto("builder");
  await page.locator('[aria-roledescription="draggable"][aria-label^="Add "]').nth(0).click();
  await page.getByRole("button", { name: "Share" }).click();
  await page.getByRole("menuitem", { name: /Write a comp guide/ }).click();
  const submit = page.getByRole("button", { name: "Submit on GitHub" });
  await expect(submit).toBeDisabled();
  await page.getByLabel("Comp name").fill("Smoke Test");
  await page.getByLabel("Summary").fill("A summary.");
  await expect(submit).toBeEnabled();

  // Enter starts the next tip; Backspace in an empty one removes it.
  await page.getByRole("textbox", { name: "Tip 1", exact: true }).fill("First tip.");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Second tip.");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("textbox", { name: "Tip 3", exact: true })).toBeFocused();
  await page.keyboard.press("Backspace");
  await expect(page.getByRole("textbox", { name: "Tip 3", exact: true })).toHaveCount(0);
  await expect(page.getByRole("textbox", { name: "Tip 2", exact: true })).toBeFocused();

  await page.getByText(/^File:/).click();
  const file = page.getByRole("dialog").locator("pre");
  await expect(file).toContainText('slug: "set');
  await expect(file).toContainText('tips: ["First tip.", "Second tip."]');
});

test("the tier list maker moves entries and exports the file", async ({ page }) => {
  await page.goto("tools/tier-list?kind=augments");
  const entry = page.getByRole("region", { name: "Unranked" }).getByRole("button").first();
  const name = (await entry.getAttribute("aria-label"))!.split(",")[0]!;
  await entry.click();
  await page.getByRole("menuitemradio", { name: "S tier" }).click();
  await expect(page.getByRole("region", { name: "S tier" }).getByLabel(`${name}, S tier`)).toBeVisible();
  await expect(page.getByText("Your edits, saved in this browser")).toBeVisible();

  await page.getByRole("button", { name: "Export to site" }).click();
  await page.getByText(/^File:/).click();
  await expect(page.getByRole("dialog").locator("pre")).toContainText("satisfies TierList");
});

test("site search opens a page", async ({ page }) => {
  await page.goto("");
  await expect(page.getByRole("button", { name: "Search" })).toBeVisible();
  await page.keyboard.press("Control+k");
  await page.getByRole("combobox", { name: "Search the site" }).fill("traits");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/traits/);
});
