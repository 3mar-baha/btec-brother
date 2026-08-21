import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const full_name = typeof body.full_name === "string" ? body.full_name.trim() : "";
  const phone_number =
    typeof body.phone_number === "string" ? body.phone_number.trim() : "";
  const requested_role = body.requested_role === "broker" ? "broker" : "worker";

  if (!email || !password || !full_name || !phone_number) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  // Create the auth user with a pre-confirmed email. The `on_auth_user_created`
  // trigger provisions the matching `public.users` row from user_metadata.
  const admin = createServiceClient();

  const { error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, phone_number, requested_role },
  });

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 400 });
  }

  // Establish the session immediately and persist the auth cookies.
  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    return NextResponse.json({ error: signInError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, redirect: "/pending-approval" });
}
