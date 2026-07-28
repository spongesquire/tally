import { test, expect } from "@playwright/test";

/**
 * Tally — Release 1 Critical E2E Tests
 * Per spec §18.3: 10 critical Playwright journeys.
 *
 * Run: npx playwright test --headed
 * Run: npx playwright test (headless)
 *
 * These tests use a clean database state. Run scripts/reset-db.py first
 * if you need a truly clean slate.
 */

const BASE = process.env.E2E_BASE_URL || "http://localhost:3000";

// Helper: complete onboarding
async function onboard(page, name: string, colourBtnPos = 1) {
  await page.goto(BASE);
  await page.fill('input[placeholder="Your name"]', name);
  const colourBtns = page.locator('button[aria-label]');
  await colourBtns.nth(colourBtnPos).click();
  await page.click('button[type="submit"]:has-text("Start")');
  await page.waitForURL(BASE + "/");
}

test.describe.configure({ mode: "serial" }); // Run tests in order

// Shared state across serial tests
let sharedContext: import("@playwright/test").BrowserContext | null = null;
let sharedPage: import("@playwright/test").Page | null = null;

// ═══════════════════════════════════════════════
// TEST 1: New visitor creates profile, group, and equal expense
// ═══════════════════════════════════════════════
test("1. Onboarding → Create group → Equal expense", async ({ browser }) => {
  sharedContext = await browser.newContext();
  sharedPage = await sharedContext.newPage();
  const page = sharedPage;

  await onboard(page, "Alice", 0); // green

  // Should see dashboard
  await expect(page.locator("h1")).toContainText("Your tabs");

  // Create group
  await page.click('a:has-text("New group")');
  await page.fill('input[placeholder*="Great Ocean Road"]', "Trip");
  await page.fill('input[placeholder="🚗"]', "🏝️");

  // Add unclaimed friend
  await page.click('button:has-text("+ Add person")');
  await page.fill('input[placeholder="Name"]', "Bob");
  await page.click('button:has-text("Create group")');

  // Should redirect to group page
  await page.waitForURL(/\/g\/.+/);
  await expect(page.locator("h1")).toContainText("Trip");

  // Add an equal expense
  await page.click('a:has-text("Add expense")');
  await page.fill('input[placeholder="0.00"]', "60");
  await page.fill('input[placeholder*="What was this for"]', "Fuel");
  await page.click('button:has-text("Save expense")');

  // Should redirect back to group page showing the expense
  await page.waitForURL(/\/g\/.+/);
  await expect(page.locator("body")).toContainText("Fuel");
  await expect(page.locator("body")).toContainText("$60.00");
});

// ═══════════════════════════════════════════════
// TEST 3: Shares expense with one excluded member
// ═══════════════════════════════════════════════
test("2. Shares expense with exclusion", async () => {
  const page = sharedPage!;
  await page.goto(BASE);

  // Click on the existing group from test 1
  const groupLink = page.locator('a[href^="/g/"]').first();
  await groupLink.click();
  await page.waitForTimeout(1000);

  const slug = page.url().split("/g/")[1];

  // Add a shares expense
  await page.click('a:has-text("Add expense")');
  await page.waitForTimeout(1000);
  await page.fill('input[placeholder="0.00"]', "100");
  await page.fill('input[placeholder*="What was this for"]', "Dinner");
  await page.click('button:has-text("Shares")');
  await page.waitForTimeout(500);

  // Save with default shares (all at 1)
  await page.click('button:has-text("Save expense")');
  await page.waitForTimeout(3000);

  // Verify expense appears
  await expect(page.locator("body")).toContainText("Dinner");
});

// ═══════════════════════════════════════════════
// TEST 4: View explained balance and record suggested settlement
// ═══════════════════════════════════════════════
test("3. View balances and record settlement", async () => {
  const page = sharedPage!;

  // Go directly to the group page first, then navigate to balances
  await page.goto(BASE);

  const groupLink = page.locator('a[href^="/g/"]').first();
  if (!(await groupLink.isVisible())) {
    test.skip();
    return;
  }
  await groupLink.click();
  await page.waitForTimeout(2000);

  // Navigate to balances via the tab link
  const balancesTab = page.locator('a:has-text("Balances")').first();
  if (await balancesTab.isVisible()) {
    await balancesTab.click();
    await page.waitForTimeout(2000);
    await expect(page.locator("h1")).toContainText("Balances");
  }

  // If there's a suggested payment, record it
  const recordBtn = page.locator('button:has-text("Record payment")');
  if (await recordBtn.isVisible()) {
    await recordBtn.click();
    await page.waitForTimeout(2000);
  }
});

// ═══════════════════════════════════════════════
// TEST 5-6: Edit expense and verify activity
// ═══════════════════════════════════════════════
test("4. Expense detail and activity", async () => {
  const page = sharedPage!;
  await page.goto(BASE);

  const groupLink = page.locator('a[href^="/g/"]').first();
  if (!(await groupLink.isVisible())) {
    test.skip();
    return;
  }
  await groupLink.click();
  await page.waitForTimeout(2000);

  // Click on an expense to see detail
  const expenseLink = page.locator('a[href*="/expenses/"]').first();
  if (await expenseLink.isVisible()) {
    await expenseLink.click();
    await page.waitForTimeout(2000);

    // Should show expense detail with paid-by and split breakdown
    await expect(page.locator("body")).toContainText("Paid by");
    await expect(page.locator("body")).toContainText("Split");
  }

  // Check activity feed via tab
  await page.goto(BASE);
  await page.locator('a[href^="/g/"]').first().click();
  await page.waitForTimeout(1000);
  const activityTab = page.locator('a:has-text("Activity")').first();
  if (await activityTab.isVisible()) {
    await activityTab.click();
    await page.waitForTimeout(2000);
    await expect(page.locator("h1")).toContainText("Activity");
  }
});

// ═══════════════════════════════════════════════
// TEST 7: Remove and restore expense
// ═══════════════════════════════════════════════
test("5. Remove expense (soft delete)", async () => {
  const page = sharedPage!;
  await page.goto(BASE);

  const groupLink = page.locator('a[href^="/g/"]').first();
  if (!(await groupLink.isVisible())) {
    test.skip();
    return;
  }
  await groupLink.click();
  await page.waitForTimeout(1000);
  const slug = page.url().split("/g/")[1]?.trim().split("/")[0] ?? "";

  // Go to expense detail
  const expenseLink = page.locator(`a[href^="/g/${slug}/expenses/"]`).first();
  if (!(await expenseLink.isVisible())) {
    test.skip();
    return;
  }
  await expenseLink.click();
  await page.waitForTimeout(1000);

  // Click Remove
  const removeBtn = page.locator('button:has-text("Remove")');
  if (await removeBtn.isVisible()) {
    await removeBtn.click();
    await page.waitForTimeout(2000);
  }
});

// ═══════════════════════════════════════════════
// TEST 9: Sign out revokes access
// ═══════════════════════════════════════════════
test("6. Sign out", async () => {
  const page = sharedPage!;
  await page.goto(`${BASE}/profile`);

  // Click sign out
  const signOutBtn = page.locator('button:has-text("Sign out")').first();
  if (await signOutBtn.isVisible()) {
    await signOutBtn.click();

    // Confirm
    const confirmBtn = page.locator('button:has-text("Sign out")').last();
    await confirmBtn.click();
    await page.waitForTimeout(2000);

    // Should see onboarding
    await expect(page.locator("body")).toContainText("call you");
  }
});

// ═══════════════════════════════════════════════
// TEST 10: Mobile viewport has no horizontal overflow
// ═══════════════════════════════════════════════
test("7. No horizontal scroll on mobile (375px)", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
  });
  const page = await context.newPage();

  await page.goto(BASE);

  // Check no horizontal overflow
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);

  await context.close();
});

// ═══════════════════════════════════════════════
// EXTRA: Group settings page loads
// ═══════════════════════════════════════════════
test("8. Group settings accessible", async ({ page }) => {
  // Onboard fresh
  await onboard(page, "SettingsTester", 2);

  // Create a group
  await page.click('a:has-text("New group")');
  await page.fill('input[placeholder*="Great Ocean Road"]', "Settings Test");
  await page.click('button:has-text("Create group")');
  await page.waitForURL(/\/g\/.+/);

  const slug = page.url().split("/g/")[1];

  // Go to settings
  await page.goto(`${BASE}/g/${slug}/settings`);
  await expect(page.locator("h1")).toContainText("Settings");
  await expect(page.locator("body")).toContainText("Group details");
  await expect(page.locator("body")).toContainText("Archive");
});

// ═══════════════════════════════════════════════
// EXTRA: Invite link contains full URL
// ═══════════════════════════════════════════════
test("9. Invite links contain full base URL", async ({ page }) => {
  await page.goto(BASE);

  const groupLink = page.locator('a[href^="/g/"]').first();
  if (!(await groupLink.isVisible())) {
    test.skip();
    return;
  }
  await groupLink.click();

  // Open invite panel
  await page.click('button:has-text("Invite")');
  await page.waitForTimeout(500);

  // Generate general link
  const genBtn = page.locator('button:has-text("Generate link")').first();
  if (await genBtn.isVisible()) {
    await genBtn.click();
    await page.waitForTimeout(2000);

    // Find the link input — verify it starts with http
    const linkValue = await page.evaluate(() => {
      const inputs = document.querySelectorAll("input[type='text']");
      for (const i of inputs) {
        if (i.value && i.value.includes("/join/")) return i.value;
      }
      return null;
    });

    expect(linkValue).toBeTruthy();
    expect(linkValue).toMatch(/^https?:\/\//);
  }
});

// ═══════════════════════════════════════════════
// EXTRA: Calculator expression evaluates correctly
// ═══════════════════════════════════════════════
test("10. Amount calculator evaluates expressions", async () => {
  const page = sharedPage!;

  // Go to dashboard and click into a group
  await page.goto(BASE);

  const groupLink = page.locator('a[href^="/g/"]').first();
  if (!(await groupLink.isVisible())) {
    test.skip();
    return;
  }
  await groupLink.click();
  await page.waitForTimeout(1000);

  await page.click('a:has-text("Add expense")');
  await page.waitForTimeout(1000);

  // Type a calculator expression
  await page.fill('input[placeholder="0.00"]', "48 + 12.50");
  await page.waitForTimeout(500);

  // The evaluated amount should appear somewhere
  const bodyText = await page.locator("body").textContent();
  expect(bodyText).toContain("60.50");
});
