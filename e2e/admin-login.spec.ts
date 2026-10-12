import { test, expect } from "@playwright/test";

test.describe("Admin Authentication E2E Tests", () => {
  const TEST_ADMIN_EMAIL =
    process.env.E2E_TEST_ADMIN_EMAIL || "e2e-test-admin@itsmatapanda.test";
  const TEST_ADMIN_PASSWORD =
    process.env.E2E_TEST_ADMIN_PASSWORD || "";

  test("successfully logs in with admin credentials and redirects to dashboard", async ({ page }) => {
    // 1. Navigate to admin login page
    await page.goto("/admin/login");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForLoadState("networkidle").catch(() => {});

    // 2. Check title and form inputs
    await expect(page.getByRole("heading", { name: "Login Admin", exact: true })).toBeVisible();

    // 3. Fill in isolated test credentials from environment variables
    const emailInput = page.locator("input[type='email'], input[name='email']");
    await emailInput.fill(TEST_ADMIN_EMAIL);
    await expect(emailInput).toHaveValue(TEST_ADMIN_EMAIL);

    const passwordInput = page.locator("input[type='password'], input[name='password']");
    await passwordInput.fill(TEST_ADMIN_PASSWORD);
    await expect(passwordInput).toHaveValue(TEST_ADMIN_PASSWORD);

    // 4. Submit form
    const submitBtn = page.getByRole("button", { name: /Masuk ke Dashboard|Login/i });
    await submitBtn.click();

    // 5. Verify redirection to admin dashboard
    await page.waitForURL("**/admin/dashboard", { timeout: 30000 });
    await expect(page).toHaveURL(/.*admin\/dashboard/, { timeout: 10000 });

    // 6. Verify dashboard content is visible
    await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
  });
});
