import { redirect } from "next/navigation";

import { AdminDashboard } from "@/components/admin/admin-dashboard";
import type {
  Category,
  FinancialSummary,
  LedgerRow,
  ManagedUser,
  ReportData,
  StaffPerformance,
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
  specialisation_id: number;
  created_at: string;
  completed_at: string | null;
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
      .select(
        "id, order_number, worker_id, broker_id, total_price, specialisation_id, created_at, completed_at"
      )
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

  // ---- Reports aggregation (completed orders) ------------------------------
  const monthFmt = new Intl.DateTimeFormat("ar", { month: "short" });
  const monthlyMap = new Map<string, { revenue: number; count: number }>();
  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i, 1);
    monthlyMap.set(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, {
      revenue: 0,
      count: 0,
    });
  }
  const specMap = new Map<number, { revenue: number; count: number }>();
  const staffMap = new Map<
    string,
    { revenue: number; completed: number; days: number }
  >();
  for (const o of completed) {
    if (o.completed_at) {
      const key = o.completed_at.slice(0, 7);
      const m = monthlyMap.get(key);
      if (m) {
        m.revenue += Number(o.total_price);
        m.count += 1;
      }
      const days = Math.max(
        0,
        (new Date(o.completed_at).getTime() - new Date(o.created_at).getTime()) /
          86_400_000
      );
      for (const id of [o.broker_id, o.worker_id]) {
        if (!id) continue;
        const s = staffMap.get(id) ?? { revenue: 0, completed: 0, days: 0 };
        s.revenue += Number(o.total_price);
        s.completed += 1;
        s.days += days;
        staffMap.set(id, s);
      }
    }
    const sp = specMap.get(o.specialisation_id) ?? { revenue: 0, count: 0 };
    sp.revenue += Number(o.total_price);
    sp.count += 1;
    specMap.set(o.specialisation_id, sp);
  }

  const staffRow = (id: string): StaffPerformance => {
    const s = staffMap.get(id)!;
    const name = users.find((u) => u.id === id)?.full_name ?? "—";
    return {
      id,
      name,
      revenue: s.revenue,
      completed: s.completed,
      avgDays: s.completed > 0 ? s.days / s.completed : 0,
    };
  };

  const specNameById = new Map(
    ((specsRes.data ?? []) as Category[]).map((c) => [c.id, c.name])
  );

  const reports: ReportData = {
    monthly: Array.from(monthlyMap.entries()).map(([key, v]) => ({
      label: monthFmt.format(new Date(`${key}-15`)),
      revenue: v.revenue,
      count: v.count,
    })),
    bySpecialisation: Array.from(specMap.entries())
      .map(([id, v]) => ({
        name: specNameById.get(id) ?? "—",
        revenue: v.revenue,
        count: v.count,
      }))
      .sort((a, b) => b.revenue - a.revenue),
    perBroker: Array.from(staffMap.entries())
      .filter(([id]) => users.find((u) => u.id === id)?.role === "broker")
      .map(([id]) => staffRow(id))
      .sort((a, b) => b.revenue - a.revenue),
    perWorker: Array.from(staffMap.entries())
      .filter(([id]) => users.find((u) => u.id === id)?.role === "worker")
      .map(([id]) => staffRow(id))
      .sort((a, b) => b.revenue - a.revenue),
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
        reports={reports}
        initialTab={initialTab}
      />
    </div>
  );
}
