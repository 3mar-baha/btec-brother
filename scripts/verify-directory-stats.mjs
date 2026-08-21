import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Call directory_stats (security definer, callable via service role)
const { data, error } = await admin.rpc("directory_stats");
if (error) {
  console.error("RPC error:", error.message);
  process.exit(1);
}

const members = data?.members ?? [];
console.log("total approved members:", members.length);

for (const m of members) {
  console.log(
    `\n${m.full_name} (${m.role})\n` +
    `  completed: ${m.completed}\n` +
    `  active:    ${m.active}\n` +
    `  earnings:  ${m.earnings}\n` +
    `  avg_days:  ${m.avg_days}\n` +
    `  on_time:   ${m.on_time}\n` +
    `  precise:   ${m.precise}\n` +
    `  urgent:    ${m.urgent}`
  );
}

console.log("\nmatrix rows:", (data?.matrix ?? []).length);
for (const row of data?.matrix ?? []) {
  console.log(`  ${row.worker_name} x ${row.broker_name} = ${row.count}`);
}
