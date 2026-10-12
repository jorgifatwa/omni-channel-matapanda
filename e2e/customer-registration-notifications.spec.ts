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

test.describe("Admin New Customer Registration Notifications E2E Tests", () => {
  test.beforeEach(async ({ page }) => {
    page.setDefaultTimeout(30000);
  });

  test("registers a new customer and generates an instant admin notification", async ({
    page,
    browser,
  }) => {
    const timestamp = Date.now();
    const TEST_CUSTOMER_NAME = `Customer Test ${timestamp}`;
    const TEST_CUSTOMER_EMAIL = `cust.test.${timestamp}@example.com`;
    const TEST_PASSWORD = "Password123!";

    // 1. Customer registers on storefront
    await page.goto("/account/register");
    await page.waitForLoadState("domcontentloaded");

    await page.fill("#name", TEST_CUSTOMER_NAME);
    await page.fill("#email", TEST_CUSTOMER_EMAIL);
    await page.fill("#password", TEST_PASSWORD);
    await page.click("button[type='submit']");

    // Wait for registration and auto-login or redirect
    await page.waitForURL(/.*(account|login).*/, { timeout: 15000 });

    // 2. Open Admin in the same or new context
    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();

    await loginAsAdmin(adminPage);
    await adminPage.goto("/admin/dashboard");
    await adminPage.waitForLoadState("domcontentloaded");

    // 3. Verify Notification Bell is visible in Admin Header
    const notifBell = adminPage.locator("button[aria-label='Admin Notifications']");
    await expect(notifBell).toBeVisible();

    // 4. Click Bell to open dropdown
    await notifBell.click();

    // 5. Verify dropdown menu contains "Customer Baru Terdaftar"
    const dropdown = adminPage.locator("div[role='menu'], div[data-radix-popper-content-wrapper]");
    await expect(dropdown).toBeVisible();
    await expect(dropdown.getByText(/Customer Baru Terdaftar/i).first()).toBeVisible();

    // Verify customer name / email is displayed
    await expect(
      dropdown.getByText(new RegExp(TEST_CUSTOMER_NAME, "i")).or(dropdown.getByText(new RegExp(TEST_CUSTOMER_EMAIL, "i"))).first()
    ).toBeVisible({ timeout: 10000 });

    // 6. Click "Tandai dibaca"
    const markReadBtn = dropdown.getByRole("button", { name: /Tandai dibaca/i });
    if (await markReadBtn.isVisible()) {
      await markReadBtn.click();
    }

    await adminContext.close();
  });
});
