import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const anon = createClient(url, anonKey, { auth: { persistSession: false } });

let pass = 0;
let fail = 0;
const failures = [];
function check(name, cond, detail = "") {
  if (cond) {
    pass++;
    console.log(`PASS  ${name}`);
  } else {
    fail++;
    failures.push(name);
    console.log(`FAIL  ${name}${detail ? "  ->  " + detail : ""}`);
  }
}

async function loginAs(email, password) {
  const c = createClient(url, anonKey, { auth: { persistSession: false } });
  const r = await c.auth.signInWithPassword({ email, password });
  if (r.error) throw new Error(`login ${email}: ${r.error.message}`);
  return c;
}

async function createApprovedUser(email, fullName, role) {
  const created = await admin.auth.admin.createUser({
    email,
    password: "Password123!",
    email_confirm: true,
    user_metadata: { full_name: fullName, requested_role: role },
  });
  if (created.error) throw new Error(`createUser ${email}: ${created.error.message}`);
  const id = created.data.user.id;
  // approve via admin RPC (tests approve_user too)
  const adminClient = await loginAs("admin@btechub.app", "Password123!");
  const ap = await adminClient.rpc("approve_user", { p_user_id: id, p_role: role });
  if (ap.error) throw new Error(`approve_user ${email}: ${ap.error.message}`);
  return { id, email };
}

const ts = Date.now();
const suffix = ts.toString(36);

// ============ SECTION 1: Auth + approval flow ============
console.log("\n=== 1. Auth & approval flow ===");
let workerId;
let brokerId;
try {
  const worker = await createApprovedUser(
    `worker_${suffix}@test.com`,
    "عامل اختبار",
    "worker"
  );
  workerId = worker.id;
  check("worker created + approved via approve_user RPC", true);

  const broker = await createApprovedUser(
    `broker_${suffix}@test.com`,
    "وسيط اختبار",
    "broker"
  );
  brokerId = broker.id;
  check("broker created + approved via approve_user RPC", true);
} catch (e) {
  check("create/approve users", false, e.message);
}

// verify trigger set is_approved correctly for a NEW unapproved user
try {
  const raw = await admin.auth.admin.createUser({
    email: `pending_${suffix}@test.com`,
    password: "Password123!",
    email_confirm: true,
    user_metadata: { full_name: "معلق", requested_role: "worker" },
  });
  const p = await admin
    .from("users")
    .select("is_approved, requested_role, full_name")
    .eq("id", raw.data.user.id)
    .single();
  check(
    "handle_new_user trigger: new user unapproved + metadata captured",
    p.data && p.data.is_approved === false && p.data.requested_role === "worker" && p.data.full_name === "معلق",
    JSON.stringify(p.data)
  );
} catch (e) {
  check("handle_new_user trigger", false, e.message);
}

// ============ SECTION 2: RLS sanity ============
console.log("\n=== 2. RLS sanity ===");
try {
  const r = await anon.from("users").select("id");
  check("anon cannot read users (RLS)", Array.isArray(r.data) && r.data.length === 0, `rows=${r.data?.length}`);
} catch (e) {
  check("anon cannot read users (RLS)", false, e.message);
}

// ============ SECTION 3: Order lifecycle ============
console.log("\n=== 3. Order lifecycle ===");
const specs = await admin.from("specialisations").select("id").order("id");
const grades = await admin.from("grade_levels").select("id").order("id");
const crits = await admin.from("criteria_levels").select("id").order("id");
const specId = specs.data[0].id;
const gradeId = grades.data[0].id;
const critId = crits.data[0].id;

let orderId;
let brokerClient;
let workerClient;
try {
  brokerClient = await loginAs(`broker_${suffix}@test.com`, "Password123!");
  workerClient = await loginAs(`worker_${suffix}@test.com`, "Password123!");
  check("broker + worker login", true);
} catch (e) {
  check("broker + worker login", false, e.message);
}

// 3a. broker creates order
try {
  const ins = await brokerClient.from("orders").insert({
    broker_id: brokerId,
    title: "طلب اختبار تكامل",
    client_name: "عميل تجريبي",
    client_phone: "0790000000",
    specialisation_id: specId,
    grade_id: gradeId,
    criteria_id: critId,
    unit_title: "وحدة اختبار",
    assignment_name: "مهمة اختبار",
    total_price: 100,
    deadline: new Date(Date.now() + 7 * 86400000).toISOString(),
  }).select("id, status, order_number").single();
  check("broker creates order", !ins.error && ins.data?.status === "open", ins.error?.message ?? JSON.stringify(ins.data));
  orderId = ins.data?.id;
} catch (e) {
  check("broker creates order", false, e.message);
}

// 3b. worker claims
try {
  const r = await workerClient.rpc("claim_order", { p_order_id: orderId });
  const o = await admin.from("orders").select("status, worker_id").eq("id", orderId).single();
  check("worker claims order", !r.error && o.data?.status === "in_progress" && o.data?.worker_id === workerId, r.error?.message ?? JSON.stringify(o.data));
} catch (e) {
  check("worker claims order", false, e.message);
}

// 3c. worker submits
try {
  const r = await workerClient.rpc("submit_order_solution", {
    p_order_id: orderId,
    p_submission_url: "https://drive.google.com/fake",
    p_plagiarism_rate: 5,
    p_ai_percentage: 10,
  });
  const o = await admin.from("orders").select("status, submission_url, plagiarism_rate, ai_percentage").eq("id", orderId).single();
  check("worker submits solution", !r.error && o.data?.status === "submitted" && o.data?.plagiarism_rate === 5, r.error?.message ?? JSON.stringify(o.data));
} catch (e) {
  check("worker submits solution", false, e.message);
}

// 3d. broker approves -> payouts 80/20
try {
  const r = await brokerClient.rpc("approve_and_complete_order", { p_order_id: orderId });
  const o = await admin.from("orders").select("status").eq("id", orderId).single();
  const pays = await admin.from("payouts").select("user_id, amount, share_type, status").eq("order_id", orderId);
  const workerPayout = pays.data?.find((p) => p.share_type === "worker");
  const brokerPayout = pays.data?.find((p) => p.share_type === "broker");
  check(
    "broker approves -> completed + 80/20 payouts",
    !r.error && o.data?.status === "completed" && workerPayout?.amount === 80 && brokerPayout?.amount === 20 && pays.data?.length === 2,
    r.error?.message ?? JSON.stringify(pays.data)
  );
} catch (e) {
  check("broker approves -> payouts", false, e.message);
}

// 3e. admin settles
try {
  const adminClient = await loginAs("admin@btechub.app", "Password123!");
  const r = await adminClient.rpc("settle_payout", { p_user_id: workerId, p_note: "تسوية اختبار" });
  const pays = await admin.from("payouts").select("status").eq("user_id", workerId).eq("order_id", orderId);
  check(
    "admin settles payouts",
    !r.error && pays.data?.every((p) => p.status === "settled"),
    r.error?.message ?? JSON.stringify(pays.data)
  );
} catch (e) {
  check("admin settles payouts", false, e.message);
}

// ============ SECTION 4: authorization error paths ============
console.log("\n=== 4. Authorization error paths ===");
try {
  // broker cannot claim (only workers)
  const r = await brokerClient.rpc("claim_order", { p_order_id: orderId });
  check("broker cannot claim (raises)", !!r.error, r.error?.message ?? "no error raised");
} catch (e) {
  check("broker cannot claim (raises)", true, e.message);
}

try {
  // non-admin cannot approve_user
  const r = await brokerClient.rpc("approve_user", { p_user_id: workerId, p_role: "worker" });
  check("broker cannot approve_user (raises)", !!r.error, r.error?.message ?? "no error raised");
} catch (e) {
  check("broker cannot approve_user (raises)", true, e.message);
}

// ============ SECTION 5: directory_stats reflects lifecycle ============
console.log("\n=== 5. directory_stats ===");
try {
  const r = await admin.rpc("directory_stats");
  const matrix = r.data?.matrix ?? [];
  check("directory_stats matrix has completed pair", matrix.some((m) => m.worker_id === workerId || m.broker_id === brokerId), JSON.stringify(matrix));
} catch (e) {
  check("directory_stats matrix", false, e.message);
}

// ============ SUMMARY ============
console.log(`\n========== RESULT: ${pass} passed, ${fail} failed ==========`);
if (failures.length) {
  console.log("Failures:");
  failures.forEach((f) => console.log(`  - ${f}`));
  process.exit(1);
}
