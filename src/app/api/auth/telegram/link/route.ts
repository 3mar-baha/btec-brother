import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isAuthDateFresh, verifyTelegramAuth } from "@/lib/telegram-auth";

function redirectToSettings(param: string, request: NextRequest): NextResponse {
  const url = new URL("/settings", request.url);
  url.searchParams.set(param, "1");
  return NextResponse.redirect(url);
}

/**
 * Links the authenticated user's Telegram account to their existing email
 * account. The Telegram Login Widget redirects here with an HMAC-signed
 * payload; we verify it, ensure no other account already claims this chat id,
 * then store the identity on the current user's row.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const url = new URL("/login", request.url);
    url.searchParams.set("redirectedFrom", "/settings");
    return NextResponse.redirect(url);
  }

  const payload: Record<string, string | undefined> = {};
  request.nextUrl.searchParams.forEach((value, key) => {
    payload[key] = value;
  });

  if (!verifyTelegramAuth(payload) || !isAuthDateFresh(payload.auth_date)) {
    return redirectToSettings("error", request);
  }

  const id = payload.id;
  if (!id) return redirectToSettings("error", request);

  const service = createServiceClient();

  const { data: conflict } = await service
    .from("users")
    .select("id")
    .eq("telegram_chat_id", Number(id))
    .neq("id", user.id)
    .maybeSingle();

  if (conflict) return redirectToSettings("conflict", request);

  const { error } = await service
    .from("users")
    .update({
      telegram_chat_id: Number(id),
      telegram_username: payload.username ?? null,
    })
    .eq("id", user.id);

  if (error) return redirectToSettings("error", request);

  return redirectToSettings("linked", request);
}
