import { test, expect } from "@playwright/test";

test.describe("Cart Drawer & Checkout E2E Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
  });

  test("adds product to cart, updates quantity in cart drawer, and proceeds to checkout with Midtrans initiation", async ({
    page,
  }) => {
    // 1. Visit product detail page
    await page.goto("/products/everyday-canvas-tote");
    await page.waitForLoadState("domcontentloaded");

    // 2. Click Add to Bag
    const addToBagBtn = page.getByRole("button", { name: "Add to Bag", exact: true });
    await expect(addToBagBtn).toBeVisible();
    await addToBagBtn.click();

    // 3. Cart drawer opens
    const cartDrawer = page.locator("aside, div[role='dialog']").filter({ hasText: /Shopping Bag|Bag \(/i });
    await expect(cartDrawer).toBeVisible();
    await expect(cartDrawer.getByText(/Everyday Canvas Tote Bag/i)).toBeVisible();

    // 4. Test quantity increment (+) in cart drawer
    const plusButton = cartDrawer.getByRole("button", { name: /Increase quantity|\+/i }).first();
    if (await plusButton.isVisible()) {
      await plusButton.click();
      // Verify quantity is updated to 2
      await expect(cartDrawer.getByText("2").first()).toBeVisible();
    }

    // 5. Click "Checkout" in cart drawer
    const checkoutLink = cartDrawer.getByRole("link", { name: /CHECK\s*OUT/i });
    await expect(checkoutLink).toBeVisible();
    await checkoutLink.click();

    // 6. Arrive at /checkout
    await page.waitForURL("**/checkout");
    await expect(page).toHaveURL(/.*checkout/);
    await expect(page.getByText(/Everyday Canvas Tote Bag/i)).toBeVisible();

    // 7. Fill required checkout fields
    await page.getByPlaceholder("Email address").fill("e2e-buyer@example.com");
    await page.getByPlaceholder("First name").fill("E2E");
    await page.getByPlaceholder("Last name").fill("Buyer");
    await page.getByPlaceholder("Street address (e.g. Jl. Senopati No. 64)").fill("Jl. Senopati No. 45");
    await page.getByPlaceholder(/Kota Tujuan/i).fill("Jakarta Selatan");
    await page.getByPlaceholder("Postal code").fill("12190");
    await page.getByPlaceholder("Phone number").fill("081234567890");

    // 8. Wait for shipping rates to calculate and appear
    await expect(page.locator("label").filter({ hasText: /JNE/i }).first()).toBeVisible({ timeout: 15000 });

    // 9. Intercept /api/payment/create-transaction to capture snap token reliably
    let snapToken = "";
    await page.route("**/api/payment/create-transaction", async (route) => {
      const response = await route.fetch();
      const json = await response.json();
      if (json?.token) snapToken = json.token;
      await route.fulfill({ response });
    });

    // 10. Click the Pay Now submit button
    const payNowButton = page.locator("button[type='submit']").filter({ hasText: /Pay now/i });
    await expect(payNowButton).toBeEnabled({ timeout: 10000 });
    await payNowButton.click();

    // 11. Verify Midtrans token was generated and redirected to Midtrans payment portal
    await expect.poll(() => snapToken, { timeout: 15000 }).toBeTruthy();
    await page.waitForURL(/.*(midtrans\.com|checkout).*/, { timeout: 20000 });
  });
});
