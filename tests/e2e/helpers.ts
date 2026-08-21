import { Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import path from "node:path";

// Ensure the staging Supabase env is available inside the test worker process
// (Playwright forks workers separately, so the config's process.env edits are
// not always inherited). Never load production env here.
try {
  const stagingPath = path.resolve(process.cwd(), ".env.staging");
  for (const line of readFileSync(stagingPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch {
  // .env.staging is optional at type-check time; tests will fail loudly if it's missing.
}

export const ACCOUNTS = {
  admin: { email: "admin@btechub.app", password: "Password123!" },
  broker: { email: "broker1@btechub.app", password: "Password123!" },
  worker: { email: "worker1@btechub.app", password: "Password123!" },
};

export async function login(
  page: Page,
  email: string,
  password: string,
  destination: string
) {
  await page.goto("/login");
  await page
    .getByRole("button", { name: "تسجيل الدخول بالبريد الإلكتروني" })
    .click();
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(`**${destination}`);
}

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function getUserId(email: string): Promise<string> {
  const admin = serviceClient();
  const { data, error } = await admin
    .from("users")
    .select("id")
    .eq("email", email)
    .single();
  if (error || !data) throw new Error(`user ${email} not found: ${error?.message}`);
  return data.id;
}

// Idempotent: ensure worker1 has an in_progress order to exercise daily updates.
export async function seedWorkerActiveTask() {
  const admin = serviceClient();
  const workerId = await getUserId(ACCOUNTS.worker.email);
  const brokerId = await getUserId(ACCOUNTS.broker.email);

  const { data: existing } = await admin
    .from("orders")
    .select("id")
    .eq("worker_id", workerId)
    .eq("status", "in_progress")
    .limit(1);
  if (existing && existing.length > 0) return;

  const [{ data: specs }, { data: grades }, { data: crits }] = await Promise.all([
    admin.from("specialisations").select("id").order("id").limit(1),
    admin.from("grade_levels").select("id").order("id").limit(1),
    admin.from("criteria_levels").select("id").order("id").limit(1),
  ]);
  if (!specs?.length || !grades?.length || !crits?.length) {
    throw new Error("classification reference data is missing");
  }

  const { error } = await admin.from("orders").insert({
    broker_id: brokerId,
    worker_id: workerId,
    title: "مهمة اختبار التحديث اليومي",
    client_name: "عميل اختبار",
    client_phone: "0790000000",
    specialisation_id: specs[0].id,
    grade_id: grades[0].id,
    criteria_id: crits[0].id,
    unit_title: "وحدة اختبار",
    assignment_name: "مهمة اختبار",
    total_price: 100,
    deadline: new Date(Date.now() + 7 * 86400000).toISOString(),
    status: "in_progress",
  });
  if (error) throw new Error(`seedWorkerActiveTask: ${error.message}`);
}

// Replace worker1's payouts with a single settled payout of `amount`, so the
// header balance is deterministic across runs.
export async function resetWorkerPayouts(amount: number) {
  const admin = serviceClient();
  const workerId = await getUserId(ACCOUNTS.worker.email);

  await admin.from("payouts").delete().eq("user_id", workerId);

  const { data: order } = await admin
    .from("orders")
    .select("id")
    .eq("worker_id", workerId)
    .order("created_at", { ascending: false })
    .limit(1);
  const orderId = order?.[0]?.id;
  if (!orderId) throw new Error("worker1 has no order to attach a payout to");

  const { error } = await admin.from("payouts").insert({
    order_id: orderId,
    user_id: workerId,
    amount,
    share_type: "worker",
    status: "settled",
  });
  if (error) throw new Error(`resetWorkerPayouts: ${error.message}`);
}
