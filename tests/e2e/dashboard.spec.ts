import { test, expect } from "@playwright/test";
import { ACCOUNTS, login } from "./helpers";

test("directory renders members and excludes admin", async ({ page }) => {
  await login(page, ACCOUNTS.admin.email, ACCOUNTS.admin.password, "/admin");
  await page.goto("/directory");
  await expect(page.getByRole("heading", { name: "دليل الفريق" })).toBeVisible();
  await expect(page.getByText("لا يوجد أعضاء بعد.")).toHaveCount(0);
  await expect(page.getByText("محمد الوسيط").first()).toBeVisible();
  await expect(page.getByText("أحمد المدير")).toHaveCount(0);
});

// Depends on the "عامل تضخم" test worker created during directory_stats
// verification (2 completed orders + 2 payouts → 160 earnings).
test("directory shows un-inflated earnings (160, not 320)", async ({ page }) => {
  await login(page, ACCOUNTS.admin.email, ACCOUNTS.admin.password, "/admin");
  await page.goto("/directory");
  const card = page
    .locator('a[href^="/profile/"]')
    .filter({ hasText: "عامل تضخم" })
    .first();
  await expect(card).toContainText("160 د.أ");
  await expect(card).not.toContainText("320 د.أ");
});

test("broker sees market with create-order button", async ({ page }) => {
  await login(page, ACCOUNTS.broker.email, ACCOUNTS.broker.password, "/market");
  await expect(page.getByRole("heading", { name: "سوق الطلبات" })).toBeVisible();
  await expect(page.getByRole("button", { name: "إنشاء طلب" })).toBeVisible();
});

test("worker sees market without create-order button", async ({ page }) => {
  await login(page, ACCOUNTS.worker.email, ACCOUNTS.worker.password, "/market");
  await expect(page.getByRole("heading", { name: "سوق الطلبات" })).toBeVisible();
  await expect(page.getByRole("button", { name: "إنشاء طلب" })).toHaveCount(0);
});
