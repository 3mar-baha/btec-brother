import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const admin = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data, error } = await admin.rpc("directory_stats");
if (error) {
  console.error("RPC error:", error.message);
  process.exit(1);
}

const members = data?.members ?? [];
console.log("approved members:", members.length);

let pass = 0;
let fail = 0;
for (const m of members) {
  const { data: orders } = await admin
    .from("orders")
    .select("id")
    .eq("status", "completed")
    .or(`worker_id.eq.${m.id},broker_id.eq.${m.id}`);
  const actualCompleted = orders?.length ?? 0;

  const { data: payouts } = await admin
    .from("payouts")
    .select("amount")
    .eq("user_id", m.id);
  const actualEarnings = (payouts ?? []).reduce(
    (s, p) => s + Number(p.amount),
    0
  );

  const okCompleted = Number(m.completed) === actualCompleted;
  const okEarnings = Number(m.earnings) === actualEarnings;

  if (okCompleted && okEarnings) {
    pass++;
  } else {
    fail++;
    console.log(
      `MISMATCH ${m.full_name}: completed=${m.completed} (actual ${actualCompleted}), earnings=${m.earnings} (actual ${actualEarnings})`
    );
  }
}

console.log(`\nconsistent: ${pass}, mismatched: ${fail}`);
if (fail > 0) process.exit(1);
