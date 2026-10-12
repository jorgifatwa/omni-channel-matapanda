import { test, expect } from "@playwright/test";

test.describe("Product Card & Quick-Add Modal E2E Tests", () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to ensure empty cart before each test
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
  });

  test("clicking Add to Bag on product with variants opens Quick-Add modal", async ({
    page,
  }) => {
    await page.goto("/new-arrivals");
    await page.waitForLoadState("domcontentloaded");

    // Find card for a product with variants (Micro Dumpling Bag)
    const variantCard = page
      .locator("div.group")
      .filter({ hasText: /Micro Dumpling Bag/i })
      .first();
    await expect(variantCard).toBeVisible();

    // Click "Add to Bag" on card
    const cardAddButton = variantCard.getByRole("button", { name: /Add To Bag/i });
    await cardAddButton.click();

    // Modal dialog should appear
    const modal = page.locator("div[role='dialog']");
    await expect(modal).toBeVisible();
    await expect(modal.getByText(/Micro Dumpling Bag/i)).toBeVisible();

    // Click "Add To Bag" inside modal
    const modalAddButton = modal.getByRole("button", { name: /Add To Bag/i });
    await modalAddButton.click();

    // Modal should close and cart drawer should NOT open
    await expect(modal).not.toBeVisible({ timeout: 2000 });
    const cartDrawer = page.locator("div[data-state='open'][role='dialog']").filter({ hasText: /Shopping Bag|Bag \(/i });
    await expect(cartDrawer).not.toBeVisible();

    // Navbar cart badge should update
    const cartBadge = page.locator("button[aria-label='Keranjang Belanja'] span");
    await expect(cartBadge).toHaveText("1");
  });

  test("clicking Add to Bag on product without multiple variants directly adds to cart without opening drawer", async ({
    page,
  }) => {
    await page.goto("/new-arrivals");
    await page.waitForLoadState("domcontentloaded");

    // Find card for a single-variant product (Reversible Nylon Shopper Tote)
    const toteCard = page
      .locator("div.group")
      .filter({ hasText: /Reversible Nylon Shopper Tote/i })
      .first();
    await expect(toteCard).toBeVisible();

    // Click "Add to Bag" on card
    const cardAddButton = toteCard.getByRole("button", { name: /Add To Bag/i });
    await cardAddButton.click();

    // Button shows Added To Bag feedback
    await expect(toteCard.getByText(/Added To Bag/i)).toBeVisible();

    // Cart drawer should NOT open
    const cartDrawer = page.locator("div[data-state='open'][role='dialog']").filter({ hasText: /Shopping Bag|Bag \(/i });
    await expect(cartDrawer).not.toBeVisible();

    // Navbar cart badge should update to 1
    const cartBadge = page.locator("button[aria-label='Keranjang Belanja'] span");
    await expect(cartBadge).toHaveText("1");
  });
});
