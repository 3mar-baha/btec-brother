const TELEGRAM_API = "https://api.telegram.org";

// Telegram bot tokens follow `<bot_id>:<35-char secret>`; the placeholder
// `123456:dummy_token` fails this check and is treated as "not configured".
const BOT_TOKEN_RE = /^\d+:[A-Za-z0-9_-]{20,}$/;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export { escapeHtml };

/**
 * Server-side: send a message to the configured Telegram group.
 * Returns `true` when Telegram acknowledged the message, `false` otherwise.
 * No-ops (returns false) when the bot token / chat id env vars are missing
 * or malformed, and never throws.
 */
export async function sendTelegramNotification(
  message: string
): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

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
 * Client-side: fire-and-forget a notification through the /api/telegram
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
