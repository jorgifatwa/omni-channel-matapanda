import { test, expect } from "@playwright/test";

test.describe("Navigation & Routing E2E Tests", () => {
  test("navigates to New In page via Drawer Menu and displays products", async ({ page }) => {
    await page.goto("/");
    // Click hamburger button to open universal drawer
    const menuButton = page.locator("header").getByRole("button", { name: /Buka Menu|Open Menu/i });
    await menuButton.click();

    // Click "New In" menu link in menu
    const drawer = page.locator("nav[aria-label='Navigation Menu']");
    await expect(drawer).toBeVisible();
    const newInLink = drawer.getByRole("link", { name: "New In" }).first();
    await newInLink.click();

    await page.waitForURL("**/new-arrivals");
    await expect(page).toHaveURL(/.*new-arrivals/);
    await expect(page.getByRole("heading", { name: /New In|New Arrivals/i })).toBeVisible();

    // Verify products are rendered
    const cards = page.locator("a[href^='/products/']");
    expect(await cards.count()).toBeGreaterThan(0);
  });

  test("navigates to a Brand page and displays brand products", async ({ page }) => {
    // Navigate directly to single brand it'smatapanda
    await page.goto("/brands/itsmatapanda");
    await page.waitForLoadState("domcontentloaded");

    await expect(page).toHaveURL(/.*brands\/itsmatapanda/);
    await expect(page.getByRole("heading", { name: "it'smatapanda", exact: true })).toBeVisible();

    const productCards = page.locator("a[href^='/products/']");
    expect(await productCards.count()).toBeGreaterThan(0);
  });

  test("navigates to a Category page and displays category products", async ({ page }) => {
    await page.goto("/categories/tote-bags");
    await page.waitForLoadState("domcontentloaded");

    await expect(page).toHaveURL(/.*categories\/tote-bags/);
    await expect(page.getByRole("heading", { name: /Tote Bags/i })).toBeVisible();

    const productCards = page.locator("a[href^='/products/']");
    expect(await productCards.count()).toBeGreaterThan(0);
  });

  test("opens navigation drawer and closes smoothly on smaller viewports", async ({ page }) => {
    // Set to mobile viewport (iPhone dimensions)
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");

    // The hamburger button should be visible
    const mobileMenuButton = page.locator("button[aria-label='Buka Menu'], button[aria-label='Open Menu']");
    await expect(mobileMenuButton).toBeVisible();

    // Click hamburger button to open drawer
    await mobileMenuButton.click();

    // Verify sidebar panel slides in (translate-x-0) and nav is visible
    const sidebar = page.locator("aside[aria-label='Navigation Sidebar']");
    await expect(sidebar).toHaveClass(/translate-x-0/);

    // Verify zero gap between header bottom and sidebar top
    const header = page.locator("header");
    const headerBox = await header.boundingBox();
    const sidebarBox = await sidebar.boundingBox();
    expect(headerBox).not.toBeNull();
    expect(sidebarBox).not.toBeNull();
    if (headerBox && sidebarBox) {
      expect(Math.abs(sidebarBox.y - (headerBox.y + headerBox.height))).toBeLessThanOrEqual(1.5);
    }

    const drawerNav = page.locator("nav[aria-label='Navigation Menu']");
    await expect(drawerNav).toBeVisible();

    // Check presence of key navigation links in menu
    await expect(drawerNav.getByRole("link", { name: "New In" })).toBeVisible();

    // Close menu via header toggle button
    const closeButton = page.locator("button[aria-label='Tutup Menu'], button[aria-label='Close Menu']");
    await closeButton.click();
    await expect(sidebar).toHaveClass(/-translate-x-full/);
    await expect(drawerNav).toHaveAttribute("aria-hidden", "true");
  });
});
