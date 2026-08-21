import { test, expect } from "@playwright/test";
import { ACCOUNTS, login, resetWorkerPayouts, seedWorkerActiveTask } from "./helpers";

test.beforeAll(async () => {
  await seedWorkerActiveTask();
});

test("worker adds a daily update to their active task", async ({ page }) => {
  await login(page, ACCOUNTS.worker.email, ACCOUNTS.worker.password, "/market");
  await page.goto("/workspace");

  await expect(page.getByRole("heading", { name: "لوحة العمل" })).toBeVisible();
  await expect(page.getByText("مهمة اختبار التحديث اليومي")).toBeVisible();

  const note = `تحديث تجريبي ${Date.now()}`;
  await page.getByPlaceholder("أضف تحديثاً جديداً...").fill(note);
  await page.getByRole("button", { name: "إضافة تحديث" }).click();

  await expect(page.getByText(note)).toBeVisible();
});

test("header shows the worker's settled balance", async ({ page }) => {
  await resetWorkerPayouts(250);
  await login(page, ACCOUNTS.worker.email, ACCOUNTS.worker.password, "/market");

  await expect(page.locator("header").getByText("250 د.أ")).toBeVisible();
});

test("header balance updates after client-side navigation", async ({ page }) => {
  await resetWorkerPayouts(250);
  await login(page, ACCOUNTS.worker.email, ACCOUNTS.worker.password, "/market");

  const header = page.locator("header");
  await expect(header.getByText("250 د.أ")).toBeVisible();

  // Change the settled balance behind the scenes, then navigate client-side.
  await resetWorkerPayouts(350);
  await page.getByRole("link", { name: "لوحة العمل" }).click();

  await expect(header.getByText("350 د.أ")).toBeVisible();
});
