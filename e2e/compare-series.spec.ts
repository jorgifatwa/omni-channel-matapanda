import { test, expect } from "@playwright/test";

test.describe("Compare Series Feature E2E Tests", () => {
  const TEST_ADMIN_EMAIL =
    process.env.E2E_TEST_ADMIN_EMAIL || "e2e-test-admin@itsmatapanda.test";
  const TEST_ADMIN_PASSWORD =
    process.env.E2E_TEST_ADMIN_PASSWORD || "";

  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
  });

  test("renders Compare Series section on product with series assigned and allows navigation between series items", async ({
    page,
  }) => {
    // 1. Visit product with series ("Micro Dumpling Bag")
    await page.goto("/products/micro-dumpling-bag");
    await page.waitForLoadState("domcontentloaded");

    // 2. Verify Compare Series section is rendered
    const compareSection = page.locator("section[data-testid='compare-series-section']");
    await expect(compareSection).toBeVisible();
    await expect(compareSection.getByRole("heading", { name: /Compare Dumpling Series/i })).toBeVisible();

    // 3. Verify comparison cards are displayed
    const microCard = compareSection.locator("[data-testid='compare-card-micro-dumpling-bag']");
    const xsCard = compareSection.locator("[data-testid='compare-card-xs-dumpling-bag']");

    await expect(microCard).toBeVisible();
    await expect(xsCard).toBeVisible();

    // 4. Check specifications inside card
    await expect(microCard.getByText(/Dimensi/i)).toBeVisible();
    await expect(microCard.getByText(/H14 x W16 x D10 cm/i)).toBeVisible();
    await expect(microCard.getByText(/140g/i)).toBeVisible();

    // 5. Current product is marked as "Currently Viewing" / "Sedang Dilihat"
    await expect(microCard.getByText(/Currently Viewing/i)).toBeVisible();

    // 6. Sibling product has "Shop Now" button
    const shopXsBtn = xsCard.getByRole("link", { name: /Shop Now/i });
    await expect(shopXsBtn).toBeVisible();

    // 7. Click "Shop Now" to navigate to sibling product PDP
    await shopXsBtn.click();
    await page.waitForURL("**/products/xs-dumpling-bag", { timeout: 15000 });
    await expect(page.locator("h1", { hasText: /XS Dumpling Bag/i })).toBeVisible();

    // 8. Now XS card is marked as Currently Viewing
    const newCompareSection = page.locator("section[data-testid='compare-series-section']");
    await expect(newCompareSection).toBeVisible();
    const newXsCard = newCompareSection.locator("[data-testid='compare-card-xs-dumpling-bag']");
    await expect(newXsCard.getByText(/Currently Viewing/i)).toBeVisible();
  });

  test("does NOT render Compare Series section for standalone products without series", async ({
    page,
  }) => {
    // Visit product without series ("Reversible Nylon Shopper Tote")
    await page.goto("/products/reversible-shopper-tote");
    await page.waitForLoadState("domcontentloaded");

    // Compare section should be completely absent
    const compareSection = page.locator("section[data-testid='compare-series-section']");
    await expect(compareSection).not.toBeVisible();
  });

  test("admin can manage Product Series master data and see series dropdown in product modal", async ({
    page,
  }) => {
    // 1. Login as Admin using isolated test credentials
    await page.goto("/admin/login");
    await page.waitForLoadState("domcontentloaded");

    if (!page.url().includes("/admin/dashboard")) {
      const emailInput = page.locator("input[type='email'], input[name='email']");
      if (await emailInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await emailInput.fill(TEST_ADMIN_EMAIL);
        const passwordInput = page.locator("input[type='password'], input[name='password']");
        await passwordInput.fill(TEST_ADMIN_PASSWORD);
        await page.getByRole("button", { name: /Masuk ke Dashboard|Login/i }).click();
        await page.waitForURL("**/admin/dashboard", { timeout: 20000 });
      }
    }

    // 2. Navigate to /admin/series
    await page.goto("/admin/series");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.getByRole("heading", { name: /Master Product Series/i })).toBeVisible();
    await expect(page.getByText(/Dumpling Series/i).first()).toBeVisible();

    // 3. Test creating a new temporary series
    const addSeriesBtn = page.getByRole("button", { name: /Tambah Series/i });
    await expect(addSeriesBtn).toBeVisible();
    await addSeriesBtn.click();

    const seriesModal = page.locator("div[role='dialog']").filter({ hasText: /Tambah Series Baru/i });
    await expect(seriesModal).toBeVisible();

    const seriesNameInput = seriesModal.locator("#series-name");
    await seriesNameInput.fill("E2E Test Collection Series");
    await seriesModal.locator("#series-desc").fill("Collection for automated test validation");
    await seriesModal.getByRole("button", { name: /Simpan Series/i }).click();

    await expect(seriesModal).not.toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/E2E Test Collection Series/i).first()).toBeVisible();

    // 4. Navigate to /admin/products and check series dropdown
    await page.goto("/admin/products");
    await page.waitForLoadState("domcontentloaded");

    const addProductBtn = page.getByRole("button", { name: /Tambah Produk/i });
    await addProductBtn.click();

    const prodModal = page.locator("div[role='dialog']").filter({ hasText: /Tambah Produk Baru/i });
    await expect(prodModal).toBeVisible();

    // Check Spesifikasi & Series section
    await expect(prodModal.getByText(/Spesifikasi & Series \(Opsional\)/i)).toBeVisible();
    const seriesSelect = prodModal.locator("#prod-series");
    await expect(seriesSelect).toBeVisible();
    await expect(seriesSelect.locator("option", { hasText: /Dumpling Series/i })).toBeAttached();
    await expect(seriesSelect.locator("option", { hasText: /E2E Test Collection Series/i })).toBeAttached();

    // Close modal
    await prodModal.getByRole("button", { name: /Batal/i }).click();
    await expect(prodModal).not.toBeVisible();
  });
});
