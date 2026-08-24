import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isAuthDateFresh, verifyTelegramAuth } from "@/lib/telegram-auth";

function telegramEmail(id: string): string {
  return `tg_${id}@btechub.app`;
}

/**
 * Deterministic password for a Telegram user. Derived server-side from the
 * service-role key so it is never stored and can be recomputed on every login.
 * Returns null when no secret is configured — falling back to a constant
 * would make these passwords guessable.
 */
function telegramPassword(id: string): string | null {
  const secret =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.TELEGRAM_BOT_TOKEN;
  if (!secret) return null;
  return createHash("sha256").update(`telegram:${id}:${secret}`).digest("hex");
}

function redirectWithError(request: NextRequest): NextResponse {
  const url = new URL("/login", request.url);
  url.searchParams.set("error", "telegram");
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const payload: Record<string, string | undefined> = {};
  request.nextUrl.searchParams.forEach((value, key) => {
    payload[key] = value;
  });

  if (!verifyTelegramAuth(payload) || !isAuthDateFresh(payload.auth_date)) {
    return redirectWithError(request);
  }

  const id = payload.id;
  if (!id) return redirectWithError(request);

  const email = telegramEmail(id);
  const password = telegramPassword(id);
  if (!password) return redirectWithError(request);
  const fullName =
    [payload.first_name, payload.last_name].filter(Boolean).join(" ") ||
    payload.username ||
    `Telegram ${id}`;

  const supabase = await createClient();

  let userId: string | undefined;

  const signIn = await supabase.auth.signInWithPassword({ email, password });

  if (signIn.error) {
    const service = createServiceClient();

    // If this Telegram identity is already linked to an email account, do not
    // provision a duplicate tg_* account — send the user to email sign-in.
    const { data: linkedUser } = await service
      .from("users")
      .select("id")
      .eq("telegram_chat_id", Number(id))
      .maybeSingle();

    if (linkedUser) {
      const url = new URL("/login", request.url);
      url.searchParams.set("error", "linked");
      return NextResponse.redirect(url);
    }

    // First login for this Telegram account: provision it via the service role.
    const { error: createError } = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        telegram_chat_id: id,
        telegram_username: payload.username ?? null,
      },
    });

    if (createError) return redirectWithError(request);

    const retry = await supabase.auth.signInWithPassword({ email, password });
    if (retry.error) return redirectWithError(request);
    userId = retry.data.user?.id;
  } else {
    userId = signIn.data.user?.id;
  }

  if (!userId) return redirectWithError(request);

  // Ensure the public.users row carries the Telegram identity even if the
  // handle_new_user trigger has not been updated yet.
  const service = createServiceClient();
  await service
    .from("users")
    .update({
      telegram_chat_id: Number(id),
      telegram_username: payload.username ?? null,
    })
    .eq("id", userId);

  const { data: profile } = await supabase
    .from("users")
    .select("is_approved")
    .eq("id", userId)
    .single();

  const isApproved = profile?.is_approved === true;
  const destination = new URL(
    isApproved ? "/market" : "/pending-approval",
    request.url
  );
  return NextResponse.redirect(destination);
}
