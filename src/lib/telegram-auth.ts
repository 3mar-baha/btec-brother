import { createHash, createHmac, timingSafeEqual } from "crypto";

const MAX_AUTH_AGE_SECONDS = 24 * 60 * 60;

function botToken(): string {
  return process.env.TELEGRAM_BOT_TOKEN ?? "";
}

function secretKey(token: string): Buffer {
  return createHash("sha256").update(token).digest();
}

/**
 * Verifies a Telegram Login Widget payload using the documented HMAC-SHA256
 * signature. The data-check-string is every field except `hash`, sorted by key
 * and joined with `\n` as `key=value`; the HMAC secret is SHA256(bot_token).
 */
export function verifyTelegramAuth(
  data: Record<string, string | undefined>
): boolean {
  const hash = data.hash;
  if (!hash || !/^[0-9a-fA-F]{64}$/.test(hash)) return false;

  const token = botToken();
  if (!token) return false;

  const entries: Array<[string, string]> = [];
  for (const [key, value] of Object.entries(data)) {
    if (key === "hash") continue;
    if (value === undefined || value === "") continue;
    entries.push([key, value]);
  }
  entries.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));

  const dataCheckString = entries
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const computed = createHmac("sha256", secretKey(token))
    .update(dataCheckString)
    .digest();
  const provided = Buffer.from(hash, "hex");

  if (computed.length !== provided.length) return false;
  return timingSafeEqual(computed, provided);
}

/**
 * Rejects payloads older than `maxAgeSeconds` (default 24h) to prevent replay.
 */
export function isAuthDateFresh(
  authDate: string | undefined,
  maxAgeSeconds = MAX_AUTH_AGE_SECONDS
): boolean {
  if (!authDate) return false;
  const timestamp = Number(authDate);
  if (!Number.isFinite(timestamp) || timestamp <= 0) return false;
  return Math.abs(Date.now() / 1000 - timestamp) < maxAgeSeconds;
}
