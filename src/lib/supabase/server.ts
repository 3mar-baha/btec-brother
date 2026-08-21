import { cache } from "react";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "@/types/database.types";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
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
export const getCurrentProfile = cache(async (userId: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("users")
    .select("role, full_name, avatar_url, is_approved")
    .eq("id", userId)
    .single();
  return data;
});
