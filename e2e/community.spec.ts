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

test.describe("Storefront & Admin Community (ON YOU) E2E Tests", () => {
  test.beforeEach(async ({ page }) => {
    page.setDefaultTimeout(30000);
  });

  test("renders ON YOU section and opens Beyond The Vines style Instagram modal on click", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // 1. Check Community Showcase section
    const communitySection = page.locator("section[aria-label='Community Showcase']");
    await expect(communitySection).toBeVisible();
    await expect(communitySection.getByText(/ON YOU/i)).toBeVisible();

    // 2. Click the first community post item
    const postItems = communitySection.locator("div[role='button']");
    expect(await postItems.count()).toBeGreaterThan(0);
    await postItems.first().click();

    // 3. Modal opens with Instagram details
    const modal = page.locator("div[role='dialog'][aria-label='Instagram Post Detail']");
    await expect(modal).toBeVisible();

    // Verify handle, caption, and "View on Instagram" link
    await expect(modal.getByText(/itsmatapanda/i).first()).toBeVisible();
    await expect(modal.getByText(/View on Instagram/i)).toBeVisible();

    // 4. Test Next arrow button navigation
    const nextBtn = modal.locator("button[aria-label='Next post']");
    await expect(nextBtn).toBeVisible();
    await nextBtn.click();

    // 5. Close modal
    const closeBtn = modal.locator("button[aria-label='Close modal']");
    await closeBtn.click();
    await expect(modal).not.toBeVisible();
  });

  test("renders admin community page with live preview and CRUD capabilities", async ({ page }) => {
    await loginAsAdmin(page);

    await page.goto("/admin/community");
    await page.waitForLoadState("domcontentloaded");

    // 1. Heading & Preview
    const heading = page.getByRole("heading", { name: /Pengaturan Community/i });
    await expect(heading).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Live Feed Preview/i)).toBeVisible();

    const TEST_CAPTION = "Weekend vibes in Seminyak. @test_user with Dumpling Bag #itsmatapandaOnYou";
    const TEST_CAPTION_EDITED = "Weekend vibes in Seminyak. @test_user with Dumpling Bag (EDITED)";

    // 2. Click Tambah Postingan Baru
    const addBtn = page.getByRole("button", { name: /Tambah Postingan Baru/i });
    await expect(addBtn).toBeVisible();
    await addBtn.click();

    // 3. Fill modal
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await page.fill(
      "input[placeholder*='https://images.unsplash.com']",
      "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=1200&q=85"
    );
    await page.fill("#post-caption", TEST_CAPTION);
    await page.fill("#post-date", "Oct 06");
    await page.fill("#post-ig-url", "https://instagram.com/p/test-post-123");

    // 4. Save
    await dialog.getByRole("button", { name: /Simpan Postingan/i }).click();
    await expect(dialog).not.toBeVisible({ timeout: 10000 });

    // 5. Verify appears in list
    await expect(page.getByText(TEST_CAPTION).first()).toBeVisible();

    // 6. Edit item
    const editBtn = page.locator("button").filter({ hasText: /^Edit$/ }).last();
    await editBtn.click();

    const editDialog = page.getByRole("dialog");
    await expect(editDialog).toBeVisible();
    await page.fill("#post-caption", TEST_CAPTION_EDITED);
    await editDialog.getByRole("button", { name: /Simpan Postingan/i }).click();

    await expect(editDialog).not.toBeVisible({ timeout: 10000 });
    await expect(page.getByText(TEST_CAPTION_EDITED).first()).toBeVisible();

    // 7. Cleanup: Delete item
    const deleteBtn = page.locator("button").filter({ has: page.locator("svg.lucide-trash-2") }).last();
    await deleteBtn.click();

    const alertModal = page.locator("div[role='dialog']").filter({ hasText: /Hapus Postingan Community\?/i });
    await expect(alertModal).toBeVisible();
    await alertModal.getByRole("button", { name: /Hapus/i }).click();

    await expect(page.getByText(TEST_CAPTION_EDITED)).not.toBeVisible({ timeout: 10000 });
  });
});
