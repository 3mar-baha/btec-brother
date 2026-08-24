import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import path from "node:path";
import { ACCOUNTS, login } from "./helpers";

// Final settlement flow against STAGING:
//   seed a completed order with pending 80/20 payouts
//   -> admin settles the worker from the finance ledger
//   -> payouts become settled and the worker's header balance shows 80 د.أ

let service: ReturnType<typeof createClient>;
// supabase-js strict generics infer never rows without a Database type.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const table = (name: string): any => service.from(name);
let orderId: string | null = null;
let payoutIds: string[] = [];
let workerId = "";
let workerName = "";

async function seedCompletedWithPayouts() {
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
  workerId = worker.id;
  const { data: wu } = await table("users")
    .select("full_name")
    .eq("id", worker.id)
    .single();
  workerName = wu?.full_name ?? "";
  const { data: order, error } = await table("orders")
    .insert({
      broker_id: broker.id,
      worker_id: worker.id,
      title: "طلب اختبار التسوية",
      client_name: "عميل اختبار التسوية",
      client_phone: "0795550002",
      specialisation_id: specs[0].id,
      grade_id: grades[0].id,
      criteria_id: crits[0].id,
      unit_title: "وحدة التسوية",
      assignment_name: "تكليف التسوية",
      total_price: 100,
      deadline: new Date(Date.now() + 86400000).toISOString(),
      status: "completed",
      completed_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error || !order) throw new Error(`seed order failed: ${error?.message}`);
  orderId = order.id;

  const { data: payouts, error: pErr } = await table("payouts")
    .insert([
      { order_id: order.id, user_id: worker.id, amount: 80, share_type: "worker", status: "pending" },
      { order_id: order.id, user_id: broker.id, amount: 20, share_type: "broker", status: "pending" },
    ])
    .select("id");
  if (pErr || !payouts) throw new Error(`seed payouts failed: ${pErr?.message}`);
  payoutIds = payouts.map((p: { id: string }) => p.id);
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
  await seedCompletedWithPayouts();
});

test.afterAll(async () => {
  if (payoutIds.length) {
    await table("payouts").delete().in("id", payoutIds);
  }
  if (orderId) {
    await table("activity_logs").delete().eq("order_id", orderId);
    await table("orders").delete().eq("id", orderId);
  }
});

test("admin settles pending payouts -> worker balance updates to 80", async ({
  page,
}) => {
  // Sanity: seeded payouts are pending.
  const { data: before } = await table("payouts")
    .select("status")
    .in("id", payoutIds);
  expect(before?.every((p: { status: string }) => p.status === "pending")).toBe(true);

  // Admin settles the worker's pending balance from the finance ledger —
  // target the worker's row by name (settle_payout is per-user).
  await login(page, ACCOUNTS.admin.email, ACCOUNTS.admin.password, "/admin");
  const workerRow = page.getByRole("row").filter({ hasText: workerName });
  await workerRow.getByRole("button", { name: "تسوية المبلغ" }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText(/تأكيد تحويل المستحقات المعلقة/)).toBeVisible();
  await dialog.locator("#settle-note").fill("حوالة اختبار e2e");
  await dialog.getByRole("button", { name: "تأكيد التسوية" }).click();
  await expect(page.getByText("تمت التسوية")).toBeVisible();

  const { data: workerPayout } = await table("payouts")
    .select("status, amount")
    .eq("order_id", orderId!)
    .eq("share_type", "worker")
    .single();
  expect(workerPayout?.status).toBe("settled");
  expect(Number(workerPayout?.amount)).toBe(80);

  // Worker's total settled balance (may include earlier payouts) shows in the header.
  const { data: settled } = await table("payouts")
    .select("amount")
    .eq("user_id", workerId)
    .eq("status", "settled");
  const balance = (settled ?? []).reduce(
    (s: number, p: { amount: number }) => s + Number(p.amount),
    0
  );
  await page.context().clearCookies(); // drop the admin session
  await login(page, ACCOUNTS.worker.email, ACCOUNTS.worker.password, "/market");
  await expect(page.getByText(`${balance.toLocaleString("en-US")} د.أ`).first()).toBeVisible();
});
