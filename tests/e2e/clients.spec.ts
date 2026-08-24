import { test, expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import path from "node:path";
import { ACCOUNTS, login } from "./helpers";

// ---------------------------------------------------------------------------
// Deterministic CRM fixtures on the STAGING project. Inserted before the run,
// deleted by id afterwards — nothing else in staging is touched.
// ---------------------------------------------------------------------------

const CRM_A = { name: "عميل CRM أ", phone: "07911100001", school: "مدرسة الأمل" };
const CRM_B = { name: "عميل CRM ب", phone: "07911100002", school: "مدرسة النور" };

let service: ReturnType<typeof createClient>;
// supabase-js strict generics infer `never` rows without a Database type;
// this spec only needs loose table access.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const table = (name: string): any => service.from(name);
let insertedOrderIds: string[] = [];
// Staging may lag production on the add_client_school migration; when the
// column is absent, school-dependent fixtures/assertions skip themselves.
let hasSchoolColumn = true;

async function columnExists(table: string, column: string): Promise<boolean> {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const r = await fetch(`${base}/rest/v1/${table}?select=${column}&limit=1`, {
    headers: { apikey: key, authorization: `Bearer ${key}` },
  });
  return r.status !== 400;
}

async function insertOrder(o: {
  client_name: string;
  client_phone: string;
  client_school?: string;
  status: string;
  criteria_index: number;
  grade_index: number;
  total_price: number;
}) {
  const [{ data: specs }, { data: grades }, { data: crits }, { data: broker }] =
    await Promise.all([
      table("specialisations").select("id").order("id").limit(1),
      table("grade_levels").select("id").order("id"),
      table("criteria_levels").select("id").order("id"),
      table("users").select("id").eq("email", ACCOUNTS.broker.email).single(),
    ]);
  if (!specs?.length || !grades?.length || !crits?.length || !broker) {
    throw new Error("staging reference data missing");
  }
  const payload: Record<string, unknown> = {
    broker_id: broker.id,
    title: `طلب CRM ${o.client_name}`,
    client_name: o.client_name,
    client_phone: o.client_phone,
    specialisation_id: specs[0].id,
    grade_id: grades[o.grade_index].id,
    criteria_id: crits[o.criteria_index].id,
    unit_title: "وحدة CRM",
    assignment_name: "تكليف CRM",
    total_price: o.total_price,
    deadline: new Date(Date.now() + 7 * 86400000).toISOString(),
    status: o.status,
  };
  if (hasSchoolColumn) payload.client_school = o.client_school;

  const { data, error } = await table("orders")
    .insert(payload)
    .select("id")
    .single();
  if (error || !data) throw new Error(`seed order failed: ${error?.message}`);
  insertedOrderIds.push((data as { id: string }).id);
}

test.beforeAll(async () => {
  // Same env loading pattern as tests/e2e/helpers.ts (staging only).
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

  hasSchoolColumn = await columnExists("orders", "client_school");

  // Client أ: active (in_progress) + completed → matches "active"/"completed".
  await insertOrder({
    client_name: CRM_A.name,
    client_phone: CRM_A.phone,
    client_school: CRM_A.school,
    status: "in_progress",
    criteria_index: 0, // P
    grade_index: 0,
    total_price: 150,
  });
  await insertOrder({
    client_name: CRM_A.name,
    client_phone: CRM_A.phone,
    client_school: CRM_A.school,
    status: "completed",
    criteria_index: 2, // D
    grade_index: 1,
    total_price: 250,
  });
  // Client ب: single revision order, higher value → wins "spending" sort.
  await insertOrder({
    client_name: CRM_B.name,
    client_phone: CRM_B.phone,
    client_school: CRM_B.school,
    status: "revision",
    criteria_index: 1, // M
    grade_index: 0,
    total_price: 500,
  });
});

test.afterAll(async () => {
  for (const id of insertedOrderIds) {
    await table("order_attachments").delete().eq("order_id", id);
    await table("daily_updates").delete().eq("order_id", id);
    await table("activity_logs").delete().eq("order_id", id);
    await table("payouts").delete().eq("order_id", id);
    await table("orders").delete().eq("id", id);
  }
});

// ---------------------------------------------------------------------------

async function pickSelect(page: Page, triggerIndex: number, optionText: string | RegExp) {
  const trigger = page
    .getByRole("combobox")
    .filter({ hasNotText: /قالب/ })
    .nth(triggerIndex);
  // Radix occasionally swallows a click while the portal is animating; verify
  // the value stuck on the trigger and re-pick like a human would.
  for (let attempt = 0; attempt < 3; attempt++) {
    await trigger.click();
    await page.getByRole("option", { name: optionText }).click();
    try {
      await expect(trigger).toContainText(optionText, { timeout: 2000 });
      return;
    } catch {
      // value didn't take — retry
    }
  }
  throw new Error(`pickSelect: option ${optionText} never stuck`);
}

test.describe("access control", () => {
  test("unauthenticated visitor is redirected to login", async ({ page }) => {
    await page.goto("/clients");
    await expect(page).toHaveURL(/\/login\?redirectedFrom=%2Fclients/);
  });

  test("worker is redirected away and never sees clients nav item", async ({
    page,
  }) => {
    await login(page, ACCOUNTS.worker.email, ACCOUNTS.worker.password, "/market");
    await page.goto("/clients");
    await expect(page).toHaveURL(/\/market/);
    await expect(
      page.getByRole("link", { name: "العملاء" })
    ).toHaveCount(0);
  });
});

test.describe("broker CRM view", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, ACCOUNTS.broker.email, ACCOUNTS.broker.password, "/market");
    await page.goto("/clients");
    await expect(page.getByRole("heading", { name: "العملاء" })).toBeVisible();
  });

  test("nav shows العملاء, stats cards render, seeded clients aggregate", async ({
    page,
  }) => {
    await expect(page.getByRole("link", { name: "العملاء" }).first()).toBeVisible();

    for (const label of [
      "إجمالي العملاء",
      "عدد المدارس المسجلة",
      "طلبات العملاء النشطة",
      "أكثر مدرسة طلباً",
    ]) {
      await expect(page.getByText(label)).toBeVisible();
    }

    const rowA = page.getByRole("row").filter({ hasText: CRM_A.name });
    await expect(rowA).toBeVisible();
    if (hasSchoolColumn) {
      await expect(rowA).toContainText(CRM_A.school);
    }
    await expect(rowA).toContainText("2"); // total orders
    await expect(rowA).toContainText("400"); // 150 + 250

    await expect(
      page.getByRole("row").filter({ hasText: CRM_B.name })
    ).toBeVisible();
  });

  test("omni-search by phone fragment filters rows and syncs URL", async ({
    page,
  }) => {
    const search = page.getByPlaceholder("بحث بالاسم أو الهاتف أو المدرسة…");
    await search.fill(CRM_B.phone.slice(-5)); // "00002" — unique to client ب
    await expect(page).toHaveURL(/q=/, { timeout: 5000 });
    await expect(
      page.getByRole("row").filter({ hasText: CRM_B.name })
    ).toBeVisible();
    await expect(
      page.getByRole("row").filter({ hasText: CRM_A.name })
    ).toHaveCount(0);

    // Reset button clears everything.
    await page.getByRole("button", { name: "مسح" }).click();
    await expect(
      page.getByRole("row").filter({ hasText: CRM_A.name })
    ).toBeVisible();
  });

  test("school filter isolates client's school", async ({ page }) => {
    test.skip(
      !hasSchoolColumn,
      "staging missing the add_client_school migration"
    );
    await pickSelect(page, 2, CRM_B.school); // selects: الصف، المعيار، المدرسة…
    await expect(
      page.getByRole("row").filter({ hasText: CRM_B.name })
    ).toBeVisible();
    await expect(
      page.getByRole("row").filter({ hasText: CRM_A.name })
    ).toHaveCount(0);
    await expect(page).toHaveURL(/school=/);
  });

  test("grade + criteria filters compose with search", async ({ page }) => {
    // Isolate client أ first.
    await page
      .getByPlaceholder("بحث بالاسم أو الهاتف أو المدرسة…")
      .fill("عميل CRM أ");

    // Grade composition: أ has عاشر (active, 150) + أول ثانوي (completed, 250).
    // Filtering to الصف العاشر must drop the completed order from the totals.
    await pickSelect(page, 0, "الصف العاشر");
    const rowA = page.getByRole("row").filter({ hasText: CRM_A.name });
    await expect(rowA).toBeVisible();
    await expect(rowA).toContainText("150");
    await expect(rowA).not.toContainText("250"); // completed أول ثانوي order dropped
    await expect(rowA).toContainText("1 نشط"); // عاشر order is the active one
    await expect(page).toHaveURL(/grade=/);

    await page.getByRole("button", { name: "مسح" }).click();
    await expect(
      page.getByRole("row").filter({ hasText: CRM_A.name })
    ).toBeVisible();

    // Criteria D: only أ survives (has one D order), ب (M only) disappears.
    await pickSelect(page, 1, /^D/);
    await expect(
      page.getByRole("row").filter({ hasText: CRM_A.name })
    ).toBeVisible();
    await expect(
      page.getByRole("row").filter({ hasText: CRM_B.name })
    ).toHaveCount(0);
    await expect(page).toHaveURL(/criteria=D/);
  });

  test("activity filter: revision keeps ب, completed keeps أ", async ({
    page,
  }) => {
    await page
      .getByPlaceholder("بحث بالاسم أو الهاتف أو المدرسة…")
      .fill("عميل CRM");

    await pickSelect(page, 4, "طلبات تحت التعديل"); // الصف، المعيار، المدرسة، التخصص، الحالة
    await expect(
      page.getByRole("row").filter({ hasText: CRM_B.name })
    ).toBeVisible();
    await expect(
      page.getByRole("row").filter({ hasText: CRM_A.name })
    ).toHaveCount(0);

    await pickSelect(page, 4, "مكتمل فقط");
    await expect(
      page.getByRole("row").filter({ hasText: CRM_A.name })
    ).toBeVisible();
    await expect(
      page.getByRole("row").filter({ hasText: CRM_B.name })
    ).toHaveCount(0);
    await expect(page).toHaveURL(/activity=/);
  });

  test("sorting flips order between spending and orders", async ({ page }) => {
    await page
      .getByPlaceholder("بحث بالاسم أو الهاتف أو المدرسة…")
      .fill("عميل CRM");

    // Default recent: both created now; أ inserted first so likely first —
    // switch to spending explicitly instead of relying on timestamps.
    await pickSelect(page, 5, "الأكثر إنفاقاً"); // …الحالة، الترتيب
    let rows = page.getByRole("row").filter({ hasText: "عميل CRM" });
    await expect(rows.first()).toContainText(CRM_B.name); // 500 > 400

    await pickSelect(page, 5, "الأكثر طلباً");
    rows = page.getByRole("row").filter({ hasText: "عميل CRM" });
    await expect(rows.first()).toContainText(CRM_A.name); // 2 orders > 1

    await pickSelect(page, 5, "أبجدياً");
    rows = page.getByRole("row").filter({ hasText: "عميل CRM" });
    await expect(rows.first()).toContainText(CRM_A.name); // أ < ب

    await expect(page).toHaveURL(/sort=alpha/);
  });

  test("drawer shows history timeline, badges and WhatsApp link", async ({
    page,
  }) => {
    await page
      .getByRole("row")
      .filter({ hasText: CRM_A.name })
      .first()
      .click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("heading", { name: CRM_A.name })).toBeVisible();
    await expect(dialog.getByText(`سجل الطلبات (2)`)).toBeVisible();
    await expect(dialog.getByText("قيد التنفيذ")).toBeVisible();
    await expect(dialog.getByText("مكتمل")).toBeVisible();

    const wa = dialog.locator('a[href^="https://wa.me/"]');
    await expect(wa.first()).toHaveAttribute("href", /wa\.me\/9627911100001/);

    // Close without creating anything.
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
  });

  test("drawer pre-fills create-order form with client details", async ({
    page,
  }) => {
    await page
      .getByRole("row")
      .filter({ hasText: CRM_A.name })
      .first()
      .click();

    const dialog = page.getByRole("dialog");
    await dialog
      .getByRole("button", { name: "إنشاء طلب جديد لهذا العميل" })
      .click();

    const form = page.getByRole("dialog").last();
    await expect(form.getByRole("heading", { name: "إنشاء طلب جديد" })).toBeVisible();
    const inputs = form.getByRole("textbox"); // title, name, phone, school, unit, assignment
    await expect(inputs.nth(0)).toHaveValue(""); // title untouched
    await expect(inputs.nth(1)).toHaveValue(CRM_A.name);
    await expect(inputs.nth(2)).toHaveValue(CRM_A.phone);
    if (hasSchoolColumn) {
      await expect(inputs.nth(3)).toHaveValue(CRM_A.school);
    }

    await page.keyboard.press("Escape");
  });
});

test.describe("admin CRM view", () => {
  test("admin sees clients and the broker filter", async ({ page }) => {
    await login(page, ACCOUNTS.admin.email, ACCOUNTS.admin.password, "/admin");
    await page.goto("/clients");
    await expect(page.getByRole("heading", { name: "العملاء" })).toBeVisible();

    await expect(page.getByText("الوسيط المسؤول").first()).toBeVisible();
    await expect(
      page.getByRole("row").filter({ hasText: CRM_A.name })
    ).toBeVisible();
    await expect(
      page.getByRole("row").filter({ hasText: CRM_B.name })
    ).toBeVisible();

    // Broker filter actually filters by responsible broker (broker1 owns all fixtures).
    await pickSelect(page, 4, "محمد الوسيط");
    await expect(
      page.getByRole("row").filter({ hasText: CRM_A.name })
    ).toBeVisible();
    await expect(page).toHaveURL(/broker=/);
  });

  test("admin drawer hides create-order action (brokers only)", async ({
    page,
  }) => {
    await login(page, ACCOUNTS.admin.email, ACCOUNTS.admin.password, "/admin");
    await page.goto("/clients");
    await page
      .getByRole("row")
      .filter({ hasText: CRM_A.name })
      .first()
      .click();
    const dialog = page.getByRole("dialog");
    await expect(
      dialog.getByRole("button", { name: "إنشاء طلب جديد لهذا العميل" })
    ).toHaveCount(0);
    await page.keyboard.press("Escape");
  });
});
