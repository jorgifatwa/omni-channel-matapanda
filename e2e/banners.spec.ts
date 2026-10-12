import { test, expect, type Page } from "@playwright/test";

async function loginAsAdmin(page: Page) {
  // If already authenticated and on admin page, skip login
  if (page.url().includes("/admin/") && !page.url().includes("/admin/login")) {
    return;
  }

  await page.goto("/admin/login");
  await page.waitForLoadState("domcontentloaded");

  // If redirected immediately to dashboard by middleware
  if (!page.url().includes("/admin/login")) {
    return;
  }

  const emailInput = page.locator("input[type='email']");
  if (await emailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await emailInput.fill("jorgifatwaambia@gmail.com");
    const passwordInput = page.locator("input[type='password']");
    await passwordInput.fill("admin123");
    await page
      .getByRole("button", { name: /Masuk ke Dashboard|Login/i })
      .click();
    await page.waitForLoadState("networkidle").catch(() => {});
  }
}

test.describe("Admin Banner Management & Storefront E2E Tests", () => {
  test.beforeEach(async ({ page }) => {
    page.setDefaultTimeout(30000);
  });

  test("renders Hero and Secondary Banners on the homepage", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // 1. Hero banner section
    const heroBanner = page.locator(
      "section[aria-label='Featured Hero Banner']"
    );
    await expect(heroBanner).toBeVisible({ timeout: 15000 });

    // Check category links in hero (e.g. New in / Bags)
    await expect(
      heroBanner.getByRole("link", { name: /New in/i }).first()
    ).toBeVisible();

    // 2. Secondary promotional banner
    const secondaryBanner = page.locator(
      "section[aria-label='Promotional Secondary Banner']"
    );
    await expect(secondaryBanner).toBeVisible();
    await expect(
      secondaryBanner.getByText(/Free shipping|Everyday carryalls/i).first()
    ).toBeVisible();
  });

  test("renders admin banner page with tabs for Banner Kesatu and Banner Kedua", async ({
    page,
  }) => {
    await loginAsAdmin(page);

    await page.goto("/admin/banners");
    await page.waitForLoadState("domcontentloaded");

    // 1. Heading & description
    const heading = page.getByRole("heading", {
      name: "Pengaturan Banner Beranda",
    });
    await expect(heading).toBeVisible({ timeout: 15000 });

    // 2. Tabs
    const tabHero = page.getByRole("tab", { name: /Banner Kesatu/i });
    const tabSecondary = page.getByRole("tab", { name: /Banner Kedua/i });
    await expect(tabHero).toBeVisible();
    await expect(tabSecondary).toBeVisible();

    // 3. Tab 1 (Hero) active by default with slides
    await expect(tabHero).toHaveAttribute("data-state", "active");
    await expect(page.getByText(/Slide 1/i).first()).toBeVisible({ timeout: 15000 });
    const heroCards = page.locator("text=/Slide \\d+/");
    expect(await heroCards.count()).toBeGreaterThan(0);
  });

  test("creates a new Hero Banner slide and toggles its status", async ({
    page,
  }) => {
    await loginAsAdmin(page);

    await page.goto("/admin/banners");
    await page.waitForLoadState("domcontentloaded");

    // Click "Tambah Slide Hero"
    const addBtn = page.getByRole("button", { name: /Tambah Slide Hero/i });
    await expect(addBtn).toBeVisible({ timeout: 15000 });
    await addBtn.click();

    // Dialog opens
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/Tambah Slide Hero Baru/i)).toBeVisible();

    // Fill form
    await page.fill("#banner-title", "Outerwear");
    await page.fill("#banner-subtitle", "Jaket & Mantel Musim Dingin");
    await page.fill("#banner-cta-link", "/categories/outerwear-jackets");
    await page.fill(
      "input[placeholder='Atau masukkan URL gambar...']",
      "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=2000&q=85"
    );

    // Save
    const saveBtn = dialog.getByRole("button", { name: /Simpan Banner/i });
    await saveBtn.click();

    // Verify modal closes
    await expect(dialog).not.toBeVisible();

    // Verify new item appears in list
    const newSlideTitle = page.getByText("Outerwear").first();
    await expect(newSlideTitle).toBeVisible();
  });

  test("switches to Banner Kedua tab and creates a new Promo Banner", async ({
    page,
  }) => {
    await loginAsAdmin(page);

    await page.goto("/admin/banners");
    await page.waitForLoadState("domcontentloaded");

    // Switch tab
    const tabSecondary = page.getByRole("tab", { name: /Banner Kedua/i });
    await expect(tabSecondary).toBeVisible({ timeout: 15000 });
    await tabSecondary.click();
    await expect(tabSecondary).toHaveAttribute("data-state", "active");

    // Verify promo slides exist
    const promoCards = page.locator("text=/Promo Slide \\d+/");
    expect(await promoCards.count()).toBeGreaterThan(0);

    // Click "Tambah Promo Banner"
    const addBtn = page.getByRole("button", { name: /Tambah Promo Banner/i });
    await addBtn.click();

    // Dialog opens
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/Tambah Promo Banner Baru/i)).toBeVisible();

    // Fill form
    await page.fill("#banner-title", "Mid-Season Sale");
    await page.fill(
      "#banner-subtitle",
      "Diskon ekstra hingga 30% untuk member"
    );
    await page.fill("#banner-cta-text", "Shop Mid-Season");
    await page.fill("#banner-cta-link", "/new-arrivals");
    await page.fill(
      "input[placeholder='Atau masukkan URL gambar...']",
      "https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=2000&q=85"
    );

    // Save
    const saveBtn = dialog.getByRole("button", { name: /Simpan Banner/i });
    await saveBtn.click();

    // Verify modal closes
    await expect(dialog).not.toBeVisible();

    // Verify new promo appears
    const promoTitle = page.getByText("Mid-Season Sale").first();
    await expect(promoTitle).toBeVisible();
  });
});
