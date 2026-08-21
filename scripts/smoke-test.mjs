import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function log(label, ok, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? "  ->  " + detail : ""}`);
}

// 1. directory_stats RPC
const ds = await admin.rpc("directory_stats");
log(
  "directory_stats()",
  !ds.error,
  ds.error?.message ??
    `members=${ds.data?.members?.length ?? "?"} matrix=${ds.data?.matrix?.length ?? "?"}`
);

// 2. seeded classification data
for (const t of ["specialisations", "grade_levels", "criteria_levels"]) {
  const r = await admin.from(t).select("id");
  log(`${t} count`, !r.error && r.data?.length >= 0, r.error?.message ?? `count=${r.data?.length}`);
}

// 3. users table
const u = await admin.from("users").select("id, email, role, is_approved").order("email");
log(
  "users table",
  !u.error,
  u.error?.message ?? `count=${u.data?.length} [${u.data?.map((x) => `${x.email}:${x.role}`).join(", ") ?? ""}]`
);

// 4. seeded admin login
const auth = createClient(url, anonKey, { auth: { persistSession: false } });
const login = await auth.auth.signInWithPassword({
  email: "admin@btechub.app",
  password: "Password123!",
});
log("login admin@btechub.app", !login.error, login.error?.message ?? `user=${login.data?.user?.email}`);
