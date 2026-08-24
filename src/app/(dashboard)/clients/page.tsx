import { Suspense } from "react";
import { redirect } from "next/navigation";

import { ClientsClient } from "@/components/clients/clients-client";
import type {
  BrokerOption,
  Classification,
  ClientOrder,
  CriteriaLevel,
} from "@/components/clients/types";
import {
  createClient,
  getCurrentProfile,
  getCurrentUser,
} from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ORDER_COLUMNS =
  "id, order_number, broker_id, title, unit_title, assignment_name, client_name, client_phone, client_school, specialisation_id, grade_id, criteria_id, total_price, deadline, status, created_at, completed_at";

export default async function ClientsPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) redirect("/login");

  const profile = await getCurrentProfile(user.id);
  // Client contact details never reach workers.
  if (profile.role !== "admin" && profile.role !== "broker") {
    redirect("/market");
  }

  const isBroker = profile.role === "broker";

  let ordersQuery = supabase
    .from("orders")
    .select(ORDER_COLUMNS)
    .order("created_at", { ascending: false });
  if (isBroker) {
    // Brokers manage their own clients only; RLS would still expose other
    // brokers' open orders here, so scope it explicitly.
    ordersQuery = ordersQuery.eq("broker_id", user.id);
  }

  const [ordersRes, specsRes, gradesRes, criteriaRes, usersRes] =
    await Promise.all([
      ordersQuery,
      supabase.from("specialisations").select("id, name").order("id"),
      supabase.from("grade_levels").select("id, name").order("id"),
      supabase.from("criteria_levels").select("id, code, name").order("id"),
      supabase.from("users").select("id, full_name").eq("role", "broker"),
    ]);

  if (ordersRes.error) throw ordersRes.error;

  return (
    <Suspense>
      <ClientsClient
        initialOrders={(ordersRes.data ?? []) as ClientOrder[]}
        specialisations={(specsRes.data ?? []) as Classification[]}
        gradeLevels={(gradesRes.data ?? []) as Classification[]}
        criteriaLevels={(criteriaRes.data ?? []) as CriteriaLevel[]}
        brokers={(usersRes.data ?? []) as BrokerOption[]}
        role={profile.role as "admin" | "broker"}
        currentUserId={user.id}
      />
    </Suspense>
  );
}
