import { test, expect } from "@playwright/test";
import { ACCOUNTS, login } from "./helpers";

test("unauthenticated /market redirects to /login with redirectedFrom", async ({
  page,
}) => {
  await page.goto("/market");
  await expect(page).toHaveURL(/\/login\?redirectedFrom=/);
  await expect(page.getByText("منصة إدارة مهام BTEC الداخلية")).toBeVisible();
});

test("admin logs in and lands on /admin", async ({ page }) => {
  await login(page, ACCOUNTS.admin.email, ACCOUNTS.admin.password, "/admin");
  await expect(page.getByRole("heading", { name: "الإدارة" })).toBeVisible();
});

test("wrong password shows an error toast", async ({ page }) => {
  await page.goto("/login");
  await page
    .getByRole("button", { name: "تسجيل الدخول بالبريد الإلكتروني" })
    .click();
  await page.locator("#email").fill(ACCOUNTS.admin.email);
  await page.locator("#password").fill("wrong-password");
  await page.locator('button[type="submit"]').click();
  await expect(
    page.getByText("البريد الإلكتروني أو كلمة المرور غير صحيحة").first()
  ).toBeVisible();
});
