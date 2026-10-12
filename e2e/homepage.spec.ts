import { test, expect } from "@playwright/test";

test.describe("Homepage End-to-End Tests", () => {
  test("renders all core homepage sections with live products", async ({ page }) => {
    // 1. Visit homepage
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // 2. Announcement Bar
    const announcementBar = page.getByRole("region", { name: "Announcements" });
    await expect(announcementBar).toBeVisible();
    await expect(announcementBar.getByText(/FREE SHIPPING|RP100K OFF/i).first()).toBeVisible();

    // 3. Navbar with Logo & Hamburger Drawer Trigger
    const logo = page.locator("header").getByRole("link", { name: /it'smatapanda/i }).first();
    await expect(logo).toBeVisible();
    const menuBtn = page.locator("header").getByRole("button", { name: /Buka Menu|Open Menu/i });
    await expect(menuBtn).toBeVisible();

    // 4. Hero Banner
    const hero = page.locator("section[aria-label='Featured Hero Banner']");
    await expect(hero).toBeVisible();

    // 5. Section 1 (Green Banner: New In)
    const newInSection = page.locator("section").filter({ has: page.getByRole("heading", { name: "New In", level: 2 }) });
    await expect(newInSection).toBeVisible();
    // Check that it contains real product cards with Add to Bag button
    const newInAddButtons = newInSection.getByRole("button", { name: /Add To Bag/i });
    expect(await newInAddButtons.count()).toBeGreaterThan(0);

    // 6. Section 2 (Pink Banner: Bags)
    const bagsSection = page.locator("section").filter({ has: page.getByRole("heading", { name: /Bags/i, level: 2 }) });
    await expect(bagsSection).toBeVisible();
    const bagsAddButtons = bagsSection.getByRole("button", { name: /Add To Bag/i });
    expect(await bagsAddButtons.count()).toBeGreaterThan(0);

    // 7. Section 3 (Royal Blue Banner: Your Favourites)
    const favSection = page.locator("section").filter({ has: page.getByRole("heading", { name: "Your Favourites", level: 2 }) });
    await expect(favSection).toBeVisible();
    const favAddButtons = favSection.getByRole("button", { name: /Add To Bag/i });
    expect(await favAddButtons.count()).toBeGreaterThan(0);

    // 8. Community Showcase (ON YOU)
    const communitySection = page.locator("section[aria-label='Community Showcase']");
    await expect(communitySection).toBeVisible();
    await expect(communitySection.getByText(/ON YOU/i)).toBeVisible();

    // 9. Newsletter Section (Blue block)
    const newsletter = page.locator("section[aria-label='Newsletter Subscription']");
    await expect(newsletter).toBeVisible();
    await expect(newsletter.getByPlaceholder(/masukkan email/i)).toBeVisible();

    // 10. Footer (4 columns & links)
    const footer = page.locator("footer");
    await expect(footer).toBeVisible();
    await expect(footer.getByText(/About it'smatapanda/i)).toBeVisible();
    await expect(footer.getByText("Explore")).toBeVisible();
    await expect(footer.getByText("Support")).toBeVisible();
  });
});
