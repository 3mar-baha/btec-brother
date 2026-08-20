import { redirect } from "next/navigation";

import { DashboardNav, type NavUser } from "@/components/dashboard/nav";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [profileRes, payoutsRes] = await Promise.all([
    supabase
      .from("users")
      .select("role, full_name, avatar_url")
      .eq("id", user.id)
      .single(),
    supabase.from("payouts").select("amount, status").eq("user_id", user.id),
  ]);

  const profile = profileRes.data;
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
      <main className="mx-auto w-full max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
