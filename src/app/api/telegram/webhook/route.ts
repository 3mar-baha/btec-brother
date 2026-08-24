import { createHash, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";

import { createServiceClient } from "@/lib/supabase/service";
import { sendTelegramMessage } from "@/lib/telegram";

type TelegramUpdate = {
  message?: {
    text?: string;
    from?: {
      id?: number;
      username?: string;
      first_name?: string;
    };
  };
};

/**
 * Secret set via setWebhook's `secret_token`. Derived deterministically from
 * the bot token so it needs no extra env var.
 */
function webhookSecret(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN ?? "";
  return createHash("sha256")
    .update(`btec-hub-telegram-webhook:${token}`)
    .digest("hex");
}

/**
 * Receives bot updates from Telegram. Handles the `/start <token>` deep link:
 * resolves the one-time token, stores the sender's chat id on their account,
 * then confirms. Anything else is ignored (but acknowledged with 200).
 */
export async function POST(request: Request) {
  const provided = request.headers.get("x-telegram-bot-api-secret-token");
  const expected = webhookSecret();
  if (
    !provided ||
    provided.length !== expected.length ||
    !timingSafeEqual(Buffer.from(provided), Buffer.from(expected))
  ) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let update: TelegramUpdate;
  try {
    update = (await request.json()) as TelegramUpdate;
  } catch {
    return NextResponse.json({ ok: true });
  }

  const message = update.message;
  const from = message?.from;
  const text = message?.text ?? "";

  if (!text.startsWith("/start") || !from?.id) {
    return NextResponse.json({ ok: true });
  }

  const token = text.split(/\s+/)[1];
  if (!token) {
    return NextResponse.json({ ok: true });
  }

  const chatId = from.id;
  const username = from.username ?? null;

  const service = createServiceClient();

  const { data: link, error: linkError } = await service
    .from("telegram_link_tokens")
    .select("user_id")
    .eq("token", token)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (linkError || !link) {
    await sendTelegramMessage(
      chatId,
      "رمز الربط غير صالح أو منتهي الصلاحية. اذهب إلى صفحة الإعدادات في BETC Brother وحاول مجدداً."
    );
    return NextResponse.json({ ok: true });
  }

  const { error: updateError } = await service
    .from("users")
    .update({ telegram_chat_id: chatId, telegram_username: username })
    .eq("id", link.user_id);

  if (updateError) {
    await sendTelegramMessage(chatId, "تعذر الربط. حاول مجدداً.");
    return NextResponse.json({ ok: true });
  }

  await service.from("telegram_link_tokens").delete().eq("token", token);
  await sendTelegramMessage(
    chatId,
    "تم ربط حسابك على BETC Brother بنجاح. ستصلك إشعارات المهام هنا."
  );

  return NextResponse.json({ ok: true });
}
