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

    // 9. Choose QRIS and pay: the server creates a Midtrans Core API charge
    await page.getByTestId("pay-method-qris").click();
    const chargePromise = page.waitForResponse((r) => r.url().includes("/api/payment/charge"));
    const payNowButton = page.locator("button[type='submit']").filter({ hasText: /Bayar dengan QRIS/i });
    await expect(payNowButton).toBeEnabled({ timeout: 10000 });
    await payNowButton.click();

    // 10. Our own payment page shows the QRIS code (no redirect to Midtrans)
    const charge = await chargePromise;
    expect(charge.status()).toBe(200);
    await expect(page.getByTestId("qr-image")).toBeVisible({ timeout: 15000 });
    expect(page.url()).toContain("/checkout");
  });
});
