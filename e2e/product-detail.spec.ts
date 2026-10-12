import { test, expect } from "@playwright/test";

test.describe("Product Detail Page (PDP) E2E Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
  });

  test("renders full PDP features: gallery, color swatches, size selection, tabs, and recommendation sections", async ({
    page,
  }) => {
    // 1. Visit product detail page
    await page.goto("/products/micro-dumpling-bag");
    await page.waitForLoadState("domcontentloaded");

    // Title
    await expect(page.getByRole("heading", { name: "Micro Dumpling Bag" })).toBeVisible();

    // Image Gallery
    const mainImage = page.locator("div.cursor-zoom-in img").first();
    await expect(mainImage).toBeVisible();

    // Color Swatches
    await expect(page.getByText(/Colours:/i)).toBeVisible();
    const colorButtons = page.locator("button[title]");
    expect(await colorButtons.count()).toBeGreaterThan(0);

    // Size Selection
    await expect(page.getByText(/Size:/i)).toBeVisible();

    // Tabs: Product Details & Shipping
    await expect(page.getByRole("button", { name: "Product Details" })).toBeVisible();
    const shippingTab = page.getByRole("button", { name: "Shipping & Returns" });
    await expect(shippingTab).toBeVisible();

    // Click Shipping & Returns tab and check content
    await shippingTab.click();
    await expect(page.getByText(/Pengiriman Seluruh Indonesia/i)).toBeVisible();

    // Add to Bag
    const addToBagButton = page.getByRole("button", { name: "Add to Bag", exact: true });
    await expect(addToBagButton).toBeVisible();
    await addToBagButton.click();

    // Verify cart drawer opens with item
    const cartDrawer = page.locator("aside, div[role='dialog']").filter({ hasText: /Shopping Bag|Bag \(/i });
    await expect(cartDrawer).toBeVisible();
    await expect(cartDrawer.getByText(/Micro Dumpling Bag/i)).toBeVisible();

    // Close cart drawer
    const closeCartBtn = cartDrawer.getByRole("button", { name: /Close|✕/i }).first();
    if (await closeCartBtn.isVisible()) {
      await closeCartBtn.click();
    }

    // Verify "You May Also Like" section is visible
    const youMayAlsoLike = page.locator("section[aria-label='You May Also Like']");
    await expect(youMayAlsoLike).toBeVisible();
  });

  test("tracks and renders Recently Viewed products across page visits", async ({ page }) => {
    // 1. Visit first product
    await page.goto("/products/micro-dumpling-bag");
    await page.waitForLoadState("domcontentloaded");

    // 2. Visit second product
    await page.goto("/products/xs-dumpling-bag");
    await page.waitForLoadState("domcontentloaded");

    // 3. Recently Viewed section should now display the first product
    const recentlyViewed = page.locator("section[aria-label='Recently Viewed Products']");
    await expect(recentlyViewed).toBeVisible();
    await expect(recentlyViewed.getByText(/Micro Dumpling Bag/i)).toBeVisible();
  });
});
