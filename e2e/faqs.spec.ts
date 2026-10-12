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

test.describe("Storefront & Admin FAQs Feature E2E Tests", () => {
  test.beforeEach(async ({ page }) => {
    page.setDefaultTimeout(30000);
  });

  test("renders storefront /faq page matching Beyond The Vines design with category pills, search, and accordion", async ({
    page,
  }) => {
    await page.goto("/faq");
    await page.waitForLoadState("domcontentloaded");

    // 1. Heading & Header elements
    const heading = page.getByRole("heading", { name: /^FAQs$/i, level: 1 });
    await expect(heading).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/it'smatapanda Help Center/i)).toBeVisible();

    // 2. Category Filter Pills
    await expect(page.getByRole("button", { name: /All FAQs/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Most Asked/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Delivery/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Orders/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Returns/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Product & Care/i })).toBeVisible();

    // 3. Search Bar Interaction
    const searchInput = page.locator("input[placeholder*='Cari pertanyaan']");
    await expect(searchInput).toBeVisible();
    await searchInput.fill("water-resistant");

    // Verify search filtered results
    await expect(page.getByText(/tahan air/i).first()).toBeVisible();

    // Clear search
    await searchInput.fill("");

    // 4. Test Accordion expansion
    const accordionBtn = page.getByRole("button", { name: /Apa saja koleksi tas andalan/i });
    if (await accordionBtn.isVisible()) {
      await accordionBtn.click();
      await expect(page.getByText(/Dumpling Bags/i).first()).toBeVisible();
    }

    // 5. Test Support & CTA Box
    await expect(page.getByText(/Masih Butuh Bantuan?/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /WhatsApp Support/i })).toBeVisible();
  });

  test("renders admin FAQ management page with category filters, live preview, and modal form", async ({
    page,
  }) => {
    await loginAsAdmin(page);

    await page.goto("/admin/faqs");
    await page.waitForLoadState("domcontentloaded");

    // 1. Heading check
    const heading = page.getByRole("heading", { name: /FAQs & Panduan/i });
    await expect(heading).toBeVisible({ timeout: 15000 });

    // 2. Live Accordion Preview widget check
    await expect(page.getByText(/Live Accordion Preview/i)).toBeVisible();

    // 3. Add FAQ Button check
    const addBtn = page.getByRole("button", { name: /Tambah FAQ Baru/i });
    await expect(addBtn).toBeVisible();

    // 4. Open Modal Dialog
    await addBtn.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("heading", { name: /Tambah FAQ Baru/i })).toBeVisible();

    // Close modal
    await page.getByRole("button", { name: /Batal/i }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
  });
});
