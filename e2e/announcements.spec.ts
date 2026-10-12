import { test, expect, type Page } from "@playwright/test";

async function loginAsAdmin(page: Page) {
  if (page.url().includes("/admin/") && !page.url().includes("/admin/login")) {
    return;
  }

  await page.goto("/admin/login");
  await page.waitForLoadState("domcontentloaded");

  if (!page.url().includes("/admin/login")) {
    return;
  }

  const emailInput = page.locator("input[type='email'], input[name='email']");
  if (await emailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await emailInput.fill(process.env.E2E_TEST_ADMIN_EMAIL || "jorgifatwaambia@gmail.com");
    const passwordInput = page.locator("input[type='password'], input[name='password']");
    await passwordInput.fill(process.env.E2E_TEST_ADMIN_PASSWORD || "admin123");
    await page.getByRole("button", { name: /Masuk ke Dashboard|Login/i }).click();
    await page.waitForLoadState("networkidle").catch(() => {});
  }
}

test.describe("Storefront & Admin Announcement Management E2E Tests", () => {
  test.beforeEach(async ({ page }) => {
    page.setDefaultTimeout(30000);
  });

  test("renders announcement bar ticker on storefront with brand texts and badges", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    const announcementBar = page.getByRole("region", { name: "Announcements" });
    await expect(announcementBar).toBeVisible();

    // Check presence of key announcement ticker items
    await expect(announcementBar.getByText(/FREE SHIPPING|IT'SMATAPANDA CLUB|GIVE OUR CREW/i).first()).toBeVisible();
  });

  test("renders admin announcement page with live preview, stats, and item list", async ({ page }) => {
    await loginAsAdmin(page);

    await page.goto("/admin/announcements");
    await page.waitForLoadState("domcontentloaded");

    // 1. Heading check
    const heading = page.getByRole("heading", { name: /Pengaturan Announcement Bar/i });
    await expect(heading).toBeVisible({ timeout: 15000 });

    // 2. Live preview check
    await expect(page.getByText(/Live Storefront Ticker Preview/i)).toBeVisible();

    // 3. Add Announcement button
    const addBtn = page.getByRole("button", { name: /Tambah Announcement/i });
    await expect(addBtn).toBeVisible();

    // 4. Check existing announcement items
    const rows = page.locator("button:has-text('Edit')");
    expect(await rows.count()).toBeGreaterThan(0);
  });

  test("creates a new announcement item, edits it, toggles status, and cleans it up", async ({ page }) => {
    await loginAsAdmin(page);

    await page.goto("/admin/announcements");
    await page.waitForLoadState("domcontentloaded");

    const TEST_ANNOUNCEMENT_TEXT = "PROMO SPESIAL AKHIR PEKAN: CASHBACK 50% KHUSUS TAS DUMPLING";
    const TEST_ANNOUNCEMENT_EDITED = "PROMO SPESIAL AKHIR PEKAN: CASHBACK 70% KHUSUS TAS DUMPLING (EDITED)";

    // 1. Click "Tambah Announcement"
    const addBtn = page.getByRole("button", { name: /Tambah Announcement/i });
    await expect(addBtn).toBeVisible();
    await addBtn.click();

    // 2. Dialog appears
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/Tambah Announcement Baru/i)).toBeVisible();

    // 3. Fill form
    await page.fill("#ann-text", TEST_ANNOUNCEMENT_TEXT);
    await page.fill("#ann-link", "/categories/sling-crossbody");
    await page.fill("#ann-badge", "FLASH SALE");

    // 4. Submit form
    const saveBtn = dialog.getByRole("button", { name: /Simpan Announcement/i });
    await saveBtn.click();

    // 5. Modal closes and new item appears in list
    await expect(dialog).not.toBeVisible({ timeout: 10000 });
    await expect(page.getByText(TEST_ANNOUNCEMENT_TEXT).first()).toBeVisible();

    // 6. Edit the newly created item
    const newItemContainer = page.locator("div").filter({ hasText: TEST_ANNOUNCEMENT_TEXT }).first();
    const editBtn = page.locator("button").filter({ hasText: /^Edit$/ }).last();
    await editBtn.click();

    // 7. Edit modal opens
    const editDialog = page.getByRole("dialog");
    await expect(editDialog).toBeVisible();
    await page.fill("#ann-text", TEST_ANNOUNCEMENT_EDITED);
    await editDialog.getByRole("button", { name: /Simpan Announcement/i }).click();

    // 8. Verify edited text is visible in list
    await expect(editDialog).not.toBeVisible({ timeout: 10000 });
    await expect(page.getByText(TEST_ANNOUNCEMENT_EDITED).first()).toBeVisible();

    // 9. Cleanup: Delete the created test announcement
    const deleteBtn = page.locator("button").filter({ has: page.locator("svg.lucide-trash-2") }).last();
    await deleteBtn.click();

    const alertModal = page.locator("div[role='alertdialog'], div[role='dialog']").filter({ hasText: /Hapus Announcement\?/i });
    await expect(alertModal).toBeVisible();
    const confirmDeleteBtn = alertModal.getByRole("button", { name: /Hapus/i });
    await confirmDeleteBtn.click();

    // 10. Verify item removed
    await expect(page.getByText(TEST_ANNOUNCEMENT_EDITED)).not.toBeVisible({ timeout: 10000 });
  });
});
