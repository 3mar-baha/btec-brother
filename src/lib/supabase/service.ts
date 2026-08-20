import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.types";

/**
 * Server-only client using the service role key. Bypasses RLS and is used for
 * admin operations such as provisioning Telegram-auth users. Never import this
 * from a client component.
 */
export function createServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
