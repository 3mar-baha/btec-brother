import { redirect } from "next/navigation";

import { MarketClient } from "@/components/market/market-client";
import type {
  Classification,
  CriteriaLevel,
  MarketOrder,
  Role,
} from "@/components/market/types";
import {
  createClient,
  getCurrentProfile,
  getCurrentUser,
} from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ORDER_COLUMNS =
  "id, order_number, broker_id, title, unit_title, assignment_name, specialisation_id, grade_id, criteria_id, total_price, worker_share, deadline, status, created_at";

export default async function MarketPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) redirect("/login");

  const [profile, ordersRes, specsRes, gradesRes, criteriaRes, activeRes] =
    await Promise.all([
      getCurrentProfile(user.id),
      supabase
        .from("orders")
        .select(ORDER_COLUMNS)
        .eq("status", "open")
        .order("created_at", { ascending: false }),
      supabase.from("specialisations").select("id, name").order("id"),
      supabase.from("grade_levels").select("id, name").order("id"),
      supabase.from("criteria_levels").select("id, code, name").order("id"),
      supabase
        .from("orders")
        .select("id")
        .eq("worker_id", user.id)
        .eq("status", "in_progress")
        .limit(1),
    ]);

  const role = (profile?.role ?? "worker") as Role;
  const userName = profile?.full_name ?? "";
  const hasActiveTask = (activeRes.data ?? []).length > 0;

  return (
    <MarketClient
      initialOrders={(ordersRes.data ?? []) as MarketOrder[]}
      specialisations={(specsRes.data ?? []) as Classification[]}
      gradeLevels={(gradesRes.data ?? []) as Classification[]}
      criteriaLevels={(criteriaRes.data ?? []) as CriteriaLevel[]}
      role={role}
      hasActiveTask={hasActiveTask}
      userName={userName}
      currentUserId={user.id}
    />
  );
}
