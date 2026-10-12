import { test, expect } from "@playwright/test";

test.describe("Admin Product CRUD E2E Tests", () => {
  const TEST_ADMIN_EMAIL =
    process.env.E2E_TEST_ADMIN_EMAIL || "e2e-test-admin@itsmatapanda.test";
  const TEST_ADMIN_PASSWORD =
    process.env.E2E_TEST_ADMIN_PASSWORD || "";

  const TEST_PRODUCT_NAME = "E2E-TEST-Hoodie-Heavyweight";
  const TEST_PRODUCT_SKU = "E2E-TEST-HD01-BLK";
  const TEST_PRODUCT_NAME_EDITED = "E2E-TEST-Hoodie-Heavyweight-Edited";

  test.beforeEach(async ({ page }) => {
    // 1. Login as Admin using isolated test account
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

    // 2. Navigate to Products page
    await page.goto("/admin/products");
    await page.waitForLoadState("domcontentloaded");
  });

  test("creates a new product with variants, edits it, and cleans it up by deletion", async ({
    page,
  }) => {
    // 1. Click "Tambah Produk"
    const addProductBtn = page.getByRole("button", { name: /Tambah Produk/i });
    await expect(addProductBtn).toBeVisible();
    await addProductBtn.click();

    // 2. Dialog appears
    const modal = page.locator("div[role='dialog']").filter({ hasText: /Tambah Produk Baru/i });
    await expect(modal).toBeVisible();

    // 3. Fill required form inputs
    await modal.locator("#prod-name").fill(TEST_PRODUCT_NAME);
    await modal.locator("#prod-sku").fill(TEST_PRODUCT_SKU);
    await modal.locator("#prod-desc").fill("Automated E2E testing product with full variant matrix");
    await modal.locator("#prod-price").fill("450000");

    // 4. Fill in Variant fields (size, color, colorGroup, colorHex, SKU, stock)
    await modal.getByRole("textbox", { name: /Size/i }).first().fill("L");
    await modal.getByRole("textbox", { name: /Warna/i }).first().fill("Navy");
    const groupInput = modal.getByRole("textbox", { name: /Classic|Seasonal/i }).first();
    if (await groupInput.isVisible()) {
      await groupInput.fill("Seasonal");
    }
    await modal.getByRole("spinbutton", { name: /Stok/i }).first().fill("20");

    // 5. Submit form
    const saveButton = modal.getByRole("button", { name: "Simpan Produk" });
    await saveButton.click();

    // 6. Verify modal closed and product appears in the table
    await expect(modal).not.toBeVisible({ timeout: 10000 });
    const productRow = page.locator("tr").filter({ hasText: TEST_PRODUCT_NAME });
    await expect(productRow).toBeVisible();

    // 7. Edit the product
    const actionsButton = productRow.locator("button").last();
    await actionsButton.click();

    const editMenuItem = page.getByRole("menuitem", { name: /Edit Produk/i });
    await expect(editMenuItem).toBeVisible();
    await editMenuItem.click();

    // 8. Dialog opens in edit mode
    const editModal = page.locator("div[role='dialog']").filter({ hasText: /Edit Produk/i });
    await expect(editModal).toBeVisible();

    // Change product name
    await editModal.locator("#prod-name").fill(TEST_PRODUCT_NAME_EDITED);
    await editModal.getByRole("button", { name: "Simpan Produk" }).click();

    // Verify updated product name in table
    await expect(editModal).not.toBeVisible({ timeout: 10000 });
    const editedRow = page.locator("tr").filter({ hasText: TEST_PRODUCT_NAME_EDITED });
    await expect(editedRow).toBeVisible();

    // 9. Cleanup: Delete the test product
    const deleteActionBtn = editedRow.locator("button").last();
    await deleteActionBtn.click();

    const deleteMenuItem = page.getByRole("menuitem", { name: /Delete/i });
    await expect(deleteMenuItem).toBeVisible();
    await deleteMenuItem.click();

    // Confirm AlertDialog
    const alertDialog = page.locator("div[role='dialog']").filter({ hasText: /Hapus Produk\?/i });
    await expect(alertDialog).toBeVisible();
    const confirmDeleteBtn = alertDialog.getByRole("button", { name: /Hapus/i });
    await confirmDeleteBtn.click();

    // Verify product is removed from table
    await expect(page.locator("tr").filter({ hasText: TEST_PRODUCT_NAME_EDITED })).not.toBeVisible({
      timeout: 10000,
    });
  });
});
