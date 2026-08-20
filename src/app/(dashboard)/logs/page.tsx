import { redirect } from "next/navigation";

import { LogsClient } from "@/components/logs/logs-client";
import type { ActivityLog, LogOrder, LogUser } from "@/components/logs/types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const LOG_COLUMNS = "id, order_id, actor_id, action, details, created_at";

export default async function LogsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [logsRes, usersRes] = await Promise.all([
    supabase
      .from("activity_logs")
      .select(LOG_COLUMNS)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.from("users").select("id, full_name, avatar_url"),
  ]);

  const logs = (logsRes.data ?? []) as ActivityLog[];
  const users = (usersRes.data ?? []) as LogUser[];

  const orderIds = Array.from(
    new Set(logs.map((l) => l.order_id).filter((id): id is string => Boolean(id)))
  );

  let orders: LogOrder[] = [];
  if (orderIds.length > 0) {
    const ordersRes = await supabase
      .from("orders")
      .select("id, order_number")
      .in("id", orderIds);
    orders = (ordersRes.data ?? []) as LogOrder[];
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink">
          السجلات والتحليلات
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          سجل مباشر لجميع أنشطة المنصة
        </p>
      </div>

      <LogsClient initialLogs={logs} users={users} orders={orders} />
    </div>
  );
}
