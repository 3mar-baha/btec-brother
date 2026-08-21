import { redirect } from "next/navigation";

import { AdminDashboard } from "@/components/admin/admin-dashboard";
import type {
  Category,
  FinancialSummary,
  LedgerRow,
  ManagedUser,
  StuckOrder,
  TransactionRow,
} from "@/components/admin/types";
import {
  createClient,
  getCurrentProfile,
  getCurrentUser,
} from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface CompletedOrder {
  id: string;
  order_number: number;
  worker_id: string | null;
  broker_id: string;
  total_price: number;
}

interface PayoutRow {
  id: string;
  user_id: string;
  order_id: string;
  amount: number;
  status: string;
  share_type: string;
  created_at: string;
}

interface UserRow {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  role: string;
  phone_number: string | null;
  is_active: boolean;
  is_approved: boolean;
  requested_role: string;
  created_at: string;
}

interface StuckRow {
  id: string;
  order_number: number;
  title: string;
  worker_id: string | null;
  deadline: string;
  status: string;
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams?: { tab?: string };
}) {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) redirect("/login");

  const profile = await getCurrentProfile(user.id);

  if (profile?.role !== "admin") redirect("/market");

  const [
    usersRes,
    completedRes,
    payoutsRes,
    specsRes,
    gradesRes,
    criteriaRes,
    stuckRes,
  ] = await Promise.all([
    supabase
      .from("users")
      .select(
        "id, email, full_name, avatar_url, role, phone_number, is_active, is_approved, requested_role, created_at"
      )
      .order("full_name"),
    supabase
      .from("orders")
      .select("id, order_number, worker_id, broker_id, total_price")
      .eq("status", "completed"),
    supabase
      .from("payouts")
      .select("id, user_id, order_id, amount, status, share_type, created_at"),
    supabase.from("specialisations").select("id, name, is_active").order("id"),
    supabase.from("grade_levels").select("id, name, is_active").order("id"),
    supabase.from("criteria_levels").select("id, code, name, is_active").order("id"),
    supabase
      .from("orders")
      .select("id, order_number, title, worker_id, deadline, status")
      .in("status", ["in_progress", "submitted", "revision"])
      .lt("deadline", new Date().toISOString()),
  ]);

  const users = (usersRes.data ?? []) as UserRow[];
  const completed = (completedRes.data ?? []) as CompletedOrder[];
  const payouts = (payoutsRes.data ?? []) as PayoutRow[];

  const summary: FinancialSummary = {
    grossRevenue: completed.reduce((s, o) => s + Number(o.total_price), 0),
    workerEarnings: payouts
      .filter((p) => p.share_type === "worker")
      .reduce((s, p) => s + Number(p.amount), 0),
    brokerCommissions: payouts
      .filter((p) => p.share_type === "broker")
      .reduce((s, p) => s + Number(p.amount), 0),
    pendingPayouts: payouts
      .filter((p) => p.status === "pending")
      .reduce((s, p) => s + Number(p.amount), 0),
    settledPayouts: payouts
      .filter((p) => p.status === "settled")
      .reduce((s, p) => s + Number(p.amount), 0),
  };

  const ledger: LedgerRow[] = users
    .filter((u) => u.role === "worker" || u.role === "broker")
    .map((u) => {
      const userPayouts = payouts.filter((p) => p.user_id === u.id);
      return {
        id: u.id,
        full_name: u.full_name,
        avatar_url: u.avatar_url,
        role: u.role,
        completedTasks: completed.filter(
          (o) => o.worker_id === u.id || o.broker_id === u.id
        ).length,
        pendingBalance: userPayouts
          .filter((p) => p.status === "pending")
          .reduce((s, p) => s + Number(p.amount), 0),
        totalPaid: userPayouts
          .filter((p) => p.status === "settled")
          .reduce((s, p) => s + Number(p.amount), 0),
      };
    });

  const orderNumberById = new Map(
    completed.map((o) => [o.id, o.order_number])
  );
  const transactions: TransactionRow[] = payouts.map((p) => {
    const member = users.find((u) => u.id === p.user_id);
    return {
      id: p.id,
      member_name: member?.full_name ?? "غير معروف",
      role: member?.role ?? "",
      order_number: orderNumberById.get(p.order_id) ?? null,
      share_type: p.share_type,
      amount: Number(p.amount),
      status: p.status,
      created_at: p.created_at,
    };
  });

  const stuckRows = (stuckRes.data ?? []) as StuckRow[];
  const stuckOrders: StuckOrder[] = stuckRows.map((o) => ({
    id: o.id,
    order_number: o.order_number,
    title: o.title,
    worker_id: o.worker_id,
    worker_name: users.find((u) => u.id === o.worker_id)?.full_name ?? null,
    deadline: o.deadline,
    status: o.status,
  }));

  const managedUsers: ManagedUser[] = users.map((u) => ({
    id: u.id,
    email: u.email,
    full_name: u.full_name,
    phone_number: u.phone_number,
    role: u.role,
    is_active: u.is_active,
    is_approved: u.is_approved,
    requested_role: u.requested_role,
    created_at: u.created_at,
  }));

  const initialTab = searchParams?.tab === "members" ? "members" : "finance";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink">
          الإدارة
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          الإدارة المالية والتحكم في المنصة
        </p>
      </div>

      <AdminDashboard
        summary={summary}
        ledger={ledger}
        transactions={transactions}
        users={managedUsers}
        specialisations={(specsRes.data ?? []) as Category[]}
        gradeLevels={(gradesRes.data ?? []) as Category[]}
        criteriaLevels={(criteriaRes.data ?? []) as Category[]}
        stuckOrders={stuckOrders}
        initialTab={initialTab}
      />
    </div>
  );
}
