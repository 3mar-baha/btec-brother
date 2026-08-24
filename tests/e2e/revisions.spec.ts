import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import path from "node:path";
import { ACCOUNTS, login } from "./helpers";

// Full revision flow against STAGING:
//   broker requests revision (with notes)
//   -> worker resubmits with updated Turnitin/AI scores
// Seeded via service role, deleted after the run.

let service: ReturnType<typeof createClient>;
// supabase-js strict generics infer never rows without a Database type.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const table = (name: string): any => service.from(name);
let orderId: string | null = null;

const NOTES = "عدّل الفقرة الثانية وأعد رفع نسبة الاقتباس أقل من ١٠٪";
const DRIVE_URL = "https://drive.google.com/file/d/e2e-revision-test/view";

async function seedSubmittedOrder() {
  const [{ data: specs }, { data: grades }, { data: crits }, { data: broker }, { data: worker }] =
    await Promise.all([
      table("specialisations").select("id").order("id").limit(1),
      table("grade_levels").select("id").order("id").limit(1),
      table("criteria_levels").select("id").order("id").limit(1),
      table("users").select("id").eq("email", ACCOUNTS.broker.email).single(),
      table("users").select("id").eq("email", ACCOUNTS.worker.email).single(),
    ]);
  if (!specs?.length || !grades?.length || !crits?.length || !broker || !worker) {
    throw new Error("staging reference data missing");
  }
  const { data, error } = await table("orders")
    .insert({
      broker_id: broker.id,
      worker_id: worker.id,
      title: "طلب اختبار التعديلات",
      client_name: "عميل اختبار التعديل",
      client_phone: "0795550001",
      specialisation_id: specs[0].id,
      grade_id: grades[0].id,
      criteria_id: crits[0].id,
      unit_title: "وحدة الاختبار",
      assignment_name: "تكليف التعديل",
      total_price: 120,
      deadline: new Date(Date.now() + 3 * 86400000).toISOString(),
      status: "submitted",
      submission_url: DRIVE_URL,
      plagiarism_rate: 22,
      ai_percentage: 30,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(`seed failed: ${error?.message}`);
  return data.id;
}

async function getOrder() {
  const { data } = await table("orders")
    .select("status, revision_notes, submission_url, plagiarism_rate, ai_percentage")
    .eq("id", orderId!)
    .single();
  return data!;
}

test.beforeAll(async () => {
  const stagingPath = path.resolve(process.cwd(), ".env.staging");
  for (const line of readFileSync(stagingPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
  service = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  orderId = await seedSubmittedOrder();
});

test.afterAll(async () => {
  if (!orderId) return;
  await table("activity_logs").delete().eq("order_id", orderId);
  await table("daily_updates").delete().eq("order_id", orderId);
  await table("payouts").delete().eq("order_id", orderId);
  await table("orders").delete().eq("id", orderId);
});

test("broker requests revision -> worker resubmits with updated scores", async ({
  page,
}) => {
  // --- Broker: request revision with notes -------------------------------
  await login(page, ACCOUNTS.broker.email, ACCOUNTS.broker.password, "/market");
  await page.goto("/workspace");
  const brokerCard = page
    .locator("div")
    .filter({ hasText: "طلب اختبار التعديلات" })
    .filter({ has: page.getByRole("button", { name: "طلب تعديل" }) })
    .last();
  await brokerCard.getByRole("button", { name: "طلب تعديل" }).click();

  const dialog = page.getByRole("dialog");
  await dialog.locator("textarea").fill(NOTES);
  await dialog.getByRole("button", { name: "إرسال طلب التعديل" }).click();

  // RPC moves submitted -> revision
  await expect.poll(async () => (await getOrder()).status).toBe("revision");
  expect((await getOrder()).revision_notes).toContain("الفقرة الثانية");

  // --- Worker: resubmit with updated scores ------------------------------
  await page.context().clearCookies(); // drop the broker session
  await login(page, ACCOUNTS.worker.email, ACCOUNTS.worker.password, "/market");
  await page.goto("/workspace");
  const workerCard = page
    .locator("div")
    .filter({ hasText: "طلب اختبار التعديلات" })
    .filter({ has: page.getByRole("button", { name: "تسليم الحل المعدل" }) })
    .last();
  await workerCard.getByRole("button", { name: "تسليم الحل المعدل" }).click();

  const submitDialog = page.getByRole("dialog");
  // Modal labels aren't htmlFor-associated; inputs are ordered dir=ltr:
  // drive URL, Turnitin %, AI %.
  const ltrInputs = submitDialog.locator('input[dir="ltr"]');
  await ltrInputs.nth(0).fill(DRIVE_URL);
  await ltrInputs.nth(1).fill("8");
  await ltrInputs.nth(2).fill("5");
  await submitDialog.getByRole("button", { name: "تسليم الحل" }).click();

  await expect(page.getByText("تم التسليم")).toBeVisible();

  const after = await getOrder();
  expect(after.status).toBe("submitted");
  expect(after.plagiarism_rate).toBe(8);
  expect(after.ai_percentage).toBe(5);
  expect(after.submission_url).toBe(DRIVE_URL);
});
