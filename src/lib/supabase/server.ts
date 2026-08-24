import { cache } from "react";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { SESSION_MAX_AGE } from "@/lib/session";
import type { Database } from "@/types/database.types";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, { ...options, maxAge: SESSION_MAX_AGE })
            );
          } catch {
            // Called from a Server Component. Safe to ignore when middleware
            // is refreshing the user session.
          }
        },
      },
    }
  );
}

// Layout + pages each used to call auth.getUser() independently, so one
// navigation fired 2-3 identical round-trips to Supabase Auth. cache()
// collapses them into one per request.
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

// Single shared profile row for role/full_name/avatar across layout + pages.
// Throws on failure so the route segment's error boundary surfaces it —
// swallowing the error here would silently render every caller as an
// unapproved "worker" (callers fall back via `profile?.role ?? "worker"`).
export const getCurrentProfile = cache(async (userId: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("users")
    .select("role, full_name, avatar_url, is_approved")
    .eq("id", userId)
    .single();
  if (error) {
    throw new Error(`تعذر تحميل بيانات الحساب: ${error.message}`);
  }
  return data;
});
