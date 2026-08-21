import { redirect } from "next/navigation";

import { BottomNav } from "@/components/dashboard/bottom-nav";
import { DashboardNav, type NavUser } from "@/components/dashboard/nav";
import {
  createClient,
  getCurrentProfile,
  getCurrentUser,
} from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) redirect("/login");

  const supabase = await createClient();

  const [profile, payoutsRes] = await Promise.all([
    getCurrentProfile(user.id),
    supabase.from("payouts").select("amount, status").eq("user_id", user.id),
  ]);
  const role = (profile?.role ?? "worker") as NavUser["role"];
  const balance = (payoutsRes.data ?? [])
    .filter((p) => p.status === "settled")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  let pendingCount = 0;
  if (role === "admin") {
    const { count } = await supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("is_approved", false)
      .eq("is_active", true);
    pendingCount = count ?? 0;
  }

  const navUser: NavUser = {
    fullName: profile?.full_name ?? user.email ?? "",
    email: user.email ?? "",
    avatarUrl: profile?.avatar_url ?? null,
    role,
    balance,
    pendingCount,
  };

  return (
    <div className="min-h-screen bg-canvas">
      <DashboardNav user={navUser} />
      <main className="mx-auto w-full max-w-6xl px-4 pt-8 pb-24 sm:px-6 sm:pb-8 lg:px-8">
        {children}
      </main>
      <BottomNav role={navUser.role} />
    </div>
  );
}
