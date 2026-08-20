import { createServiceClient } from "@/lib/supabase/service";

const TELEGRAM_API = "https://api.telegram.org";

// Telegram bot tokens follow `<bot_id>:<35-char secret>`; the placeholder
// `123456:dummy_token` fails this check and is treated as "not configured".
const BOT_TOKEN_RE = /^\d+:[A-Za-z0-9_-]{20,}$/;

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Server-side: send an HTML-parsed message to a specific Telegram chat.
 * No-ops (returns false) when the bot token is missing/malformed, and never
 * throws. `chatId` may be a group id or a private user id.
 */
async function sendRawMessage(
  chatId: string,
  message: string
): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !chatId || !BOT_TOKEN_RE.test(token)) return false;

  try {
    const res = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "HTML",
      }),
    });

    if (!res.ok) return false;

    const data = (await res.json()) as { ok?: boolean };
    return data.ok === true;
  } catch {
    return false;
  }
}

/**
 * Server-side: send a message exclusively to the team group (TELEGRAM_CHAT_ID).
 */
export async function sendGroupNotification(
  message: string
): Promise<boolean> {
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!chatId) return false;
  return sendRawMessage(chatId, message);
}

/**
 * Server-side: send a private DM to a user. Looks up their Telegram chat id
 * from `public.users` and no-ops (returns false) when they haven't linked one.
 */
export async function sendPrivateNotification(
  userId: string,
  message: string
): Promise<boolean> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("users")
    .select("telegram_chat_id")
    .eq("id", userId)
    .single();

  const chatId = data?.telegram_chat_id;
  if (!chatId) return false;
  return sendRawMessage(String(chatId), message);
}

/**
 * Client-side: fire-and-forget a group notification through the /api/telegram
 * webhook so the bot token never reaches the browser. Never blocks or throws.
 */
export function notifyTelegram(message: string): void {
  void fetch("/api/telegram", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  }).catch(() => {
    // Notifications are best-effort; the primary action must not fail.
  });
}

/**
 * Client-side: fire-and-forget a private DM to a user through /api/telegram.
 * The server resolves the user's Telegram chat id. Never blocks or throws.
 */
export function notifyTelegramUser(userId: string, message: string): void {
  void fetch("/api/telegram", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, message }),
  }).catch(() => {
    // Notifications are best-effort; the primary action must not fail.
  });
}
