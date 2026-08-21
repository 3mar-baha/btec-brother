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

const ts = Date.now().toString(36);
const workerEmail = `tgworker_${ts}@test.com`;

// create a worker + approve
const created = await admin.auth.admin.createUser({
  email: workerEmail,
  password: "Password123!",
  email_confirm: true,
  user_metadata: { full_name: "عامل تلغرام", requested_role: "worker" },
});
const workerId = created.data.user.id;
const adminClient = createClient(url, anonKey, { auth: { persistSession: false } });
await adminClient.auth.signInWithPassword({ email: "admin@btechub.app", password: "Password123!" });
await adminClient.rpc("approve_user", { p_user_id: workerId, p_role: "worker" });

const workerClient = createClient(url, anonKey, { auth: { persistSession: false } });
await workerClient.auth.signInWithPassword({ email: workerEmail, password: "Password123!" });

// 1. RLS on telegram_link_tokens
const anonRead = await anon.from("telegram_link_tokens").select("token");
check("anon cannot read telegram_link_tokens", Array.isArray(anonRead.data) && anonRead.data.length === 0, `rows=${anonRead.data?.length} err=${anonRead.error?.message}`);

const workerRead = await workerClient.from("telegram_link_tokens").select("token");
check("authenticated worker cannot read telegram_link_tokens", Array.isArray(workerRead.data) && workerRead.data.length === 0, `rows=${workerRead.data?.length}`);

// 2. service inserts token (settings page)
const token = "tok_" + ts;
const ins = await admin.from("telegram_link_tokens").insert({
  token,
  user_id: workerId,
  expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
});
check("service inserts link token", !ins.error, ins.error?.message);

// 3. simulate webhook resolution
const resolve = await admin
  .from("telegram_link_tokens")
  .select("user_id")
  .eq("token", token)
  .gt("expires_at", new Date().toISOString())
  .maybeSingle();
check("service resolves valid token", !resolve.error && resolve.data?.user_id === workerId, JSON.stringify(resolve.data));

const upd = await admin
  .from("users")
  .update({ telegram_chat_id: 123456789, telegram_username: "testuser" })
  .eq("id", workerId);
check("service stores telegram identity on user", !upd.error, upd.error?.message);

const del = await admin.from("telegram_link_tokens").delete().eq("token", token);
check("service deletes token after link", !del.error, del.error?.message);

// 4. expired token should NOT resolve
const expToken = "expired_" + ts;
await admin.from("telegram_link_tokens").insert({
  token: expToken,
  user_id: workerId,
  expires_at: new Date(Date.now() - 1000).toISOString(),
});
const expResolve = await admin
  .from("telegram_link_tokens")
  .select("user_id")
  .eq("token", expToken)
  .gt("expires_at", new Date().toISOString())
  .maybeSingle();
check("expired token does not resolve", !expResolve.error && expResolve.data === null, JSON.stringify(expResolve.data));
await admin.from("telegram_link_tokens").delete().eq("token", expToken);

// 5. field protection: worker can update own full_name but NOT telegram_chat_id
const updName = await workerClient.from("users").update({ full_name: "عامل محدث" }).eq("id", workerId);
check("worker can update own full_name", !updName.error, updName.error?.message);

const updTele = await workerClient.from("users").update({ telegram_chat_id: 999 }).eq("id", workerId);
check("worker CANNOT update own telegram_chat_id (trigger blocks)", !!updTele.error, updTele.error?.message ?? "no error raised");

// 6. unlink: service clears telegram identity
const unlink = await admin.from("users").update({ telegram_chat_id: null, telegram_username: null }).eq("id", workerId);
check("service unlinks telegram", !unlink.error, unlink.error?.message);
const afterUnlink = await admin.from("users").select("telegram_chat_id").eq("id", workerId).single();
check("telegram_chat_id cleared after unlink", afterUnlink.data?.telegram_chat_id === null, JSON.stringify(afterUnlink.data));

console.log(`\n========== RESULT: ${pass} passed, ${fail} failed ==========`);
if (failures.length) {
  failures.forEach((f) => console.log(`  - ${f}`));
  process.exit(1);
}
