import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const target = process.argv[2]?.trim() || null;

let page = 1;
let unconfirmed = [];
while (true) {
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
  if (error) {
    console.error("listUsers error:", error.message);
    process.exit(1);
  }
  const users = data.users ?? [];
  for (const u of users) {
    const confirmed = Boolean(u.email_confirmed_at) || u.email_confirm === true;
    const isTarget = target && u.email?.toLowerCase() === target.toLowerCase();
    if (!confirmed || isTarget) {
      unconfirmed.push({ id: u.id, email: u.email, confirmed });
    }
  }
  if (users.length < 200) break;
  page++;
}

if (target && unconfirmed.length === 0) {
  console.log(`No user found matching "${target}" (or it is already confirmed).`);
}

if (unconfirmed.length === 0) {
  console.log("No unconfirmed users found.");
  process.exit(0);
}

console.log(`Found ${unconfirmed.length} unconfirmed/targeted user(s):`);
for (const u of unconfirmed) {
  console.log(`  - ${u.email} (confirmed: ${u.confirmed})`);
}

for (const u of unconfirmed) {
  const { error } = await admin.auth.admin.updateUserById(u.id, {
    email_confirm: true,
  });
  if (error) {
    console.error(`  FAILED ${u.email}: ${error.message}`);
  } else {
    console.log(`  confirmed ${u.email}`);
  }
}

console.log("Done.");
