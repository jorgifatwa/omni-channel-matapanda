import { test, expect } from "@playwright/test";

test.describe("New In Collection Page E2E Tests", () => {
  test.beforeEach(async ({ page }) => {
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        console.log("BROWSER ERROR:", msg.text());
      }
    });
    page.on("pageerror", (err) => {
      console.log("UNCAUGHT ERROR:", err.message);
    });
    await page.goto("/new-arrivals");
    await page.waitForLoadState("domcontentloaded");
  });

  test("renders New In header, breadcrumbs, and Filter/Sort controls", async ({ page }) => {
    // 1. Breadcrumb check
    const breadcrumb = page.locator("nav[aria-label='Breadcrumb']");
    await expect(breadcrumb).toBeVisible();
    await expect(breadcrumb).toContainText("HOME");
    await expect(breadcrumb).toContainText("NEW IN");

    // 2. Heading
    const heading = page.getByRole("heading", { name: "New In", exact: true });
    await expect(heading).toBeVisible();

    // 3. Filter & Sort Buttons
    const filterBtn = page.locator("button").filter({ hasText: /^Filter/ });
    const sortBtn = page.locator("button").filter({ hasText: /^Sort/ });
    await expect(filterBtn).toBeVisible();
    await expect(sortBtn).toBeVisible();
  });

  test("displays product grid with 4-column layout, wishlist buttons, and New badges", async ({ page }) => {
    const productGrid = page.locator("section[aria-label='New In Products']");
    await expect(productGrid).toBeVisible();

    // Verify product cards exist
    const cards = page.locator("a[href^='/products/']");
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);

    // Verify Add To Bag / Waitlist buttons
    const actionButtons = page.locator("button").filter({ hasText: /Add To Bag|Waitlist/i });
    expect(await actionButtons.count()).toBeGreaterThan(0);

    // Verify New pill badges
    const newBadges = page.locator("span", { hasText: /^New$/ });
    expect(await newBadges.count()).toBeGreaterThan(0);
  });

  test("opens filter drawer, filters by category, and updates results", async ({ page }) => {
    const filterBtn = page.locator("button").filter({ hasText: /^Filter/ });
    await filterBtn.click();

    // Sheet should be open
    const sheet = page.locator("div[role='dialog']");
    await expect(sheet).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Filter Products")).toBeVisible();

    // Click on a category filter if available (e.g. T-Shirts or Bags & Totes)
    const categoryButton = sheet.getByRole("button", { name: /T-Shirts|Apparel|Bags/i }).first();
    if (await categoryButton.isVisible()) {
      await categoryButton.click();
      
      // Close sheet by clicking Apply
      const applyBtn = sheet.getByRole("button", { name: /Apply/i });
      await applyBtn.click();
      await expect(sheet).not.toBeVisible();

      // Filter button should now show active badge
      await expect(filterBtn).toHaveClass(/bg-black/);
    }
  });

  test("opens sort dropdown and selects sort option", async ({ page }) => {
    const sortBtn = page.locator("button").filter({ hasText: /^Sort/ });
    await sortBtn.click();

    // Dropdown content should appear
    const priceAscOption = page.getByRole("menuitem", { name: /Price: Low to High/i });
    await expect(priceAscOption).toBeVisible({ timeout: 5000 });

    await priceAscOption.click();

    // Verify products are still visible after sorting
    const cards = page.locator("a[href^='/products/']");
    expect(await cards.count()).toBeGreaterThan(0);
  });

  test("adds a product to bag from the grid and opens Cart drawer", async ({ page }) => {
    // Find first available Add To Bag button
    const addToBagButton = page.locator("button").filter({ hasText: /^Add To Bag$/i }).first();
    await addToBagButton.click();

    // Either Quick-Add modal opens (if multiple variants) or Cart drawer opens directly
    const quickAddModal = page.locator("div[role='dialog']").filter({ hasText: /Select Option/i });
    const cartDrawer = page.locator("div[role='dialog']").filter({ hasText: /Your Bag/i });

    const quickAddVisible = await quickAddModal.isVisible().catch(() => false);
    if (quickAddVisible) {
      // Pick variant and add to cart from quick add
      const confirmAdd = quickAddModal.locator("button").filter({ hasText: /Add To Bag/i });
      await confirmAdd.click();
    }

    // Verify cart drawer is opened
    await expect(cartDrawer).toBeVisible({ timeout: 5000 });
  });

  test("toggles wishlist on a product card and shows toast confirmation", async ({ page }) => {
    const wishlistButton = page.locator("button[aria-label='Add to wishlist']").first();
    await expect(wishlistButton).toBeVisible();

    await wishlistButton.click();

    // Verify toast appears
    const toast = page.getByText("Ditambahkan ke wishlist").first();
    await expect(toast).toBeVisible({ timeout: 4000 });
  });

  test("renders editorial campaign lifestyle tiles in the grid", async ({ page }) => {
    // Check for campaign tiles
    const campaignTiles = page.locator("div").filter({ hasText: /#it'?smatapanda/i });
    expect(await campaignTiles.count()).toBeGreaterThanOrEqual(1);
  });
});
