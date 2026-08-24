import { createClient } from "@/lib/supabase/server";

export interface ProfileMember {
  id: string;
  email: string;
  full_name: string;
  role: string;
  phone_number: string | null;
  avatar_url: string | null;
  telegram_username: string | null;
  created_at: string;
}

export interface CollaborationEntry {
  peer_id: string;
  peer_name: string;
  count: number;
}

export interface RecentOrder {
  id: string;
  order_number: number;
  title: string;
  status: string;
  side: "worker" | "broker";
  share: number;
  created_at: string;
}

export interface ProfileData {
  member: ProfileMember;
  earnings: number;
  pendingBalance: number;
  completedTasks: number;
  activeTasks: number;
  avgCompletionDays: number;
  collaboration: CollaborationEntry[];
  recentOrders: RecentOrder[];
}

const ORDER_COLUMNS =
  "id, order_number, title, status, worker_id, broker_id, worker_share, broker_share, created_at, completed_at";

/**
 * Aggregates a single member's profile dashboard data. Safe under RLS: a
 * worker/broker can only query their own orders, and admins read any member.
 */
export async function loadProfileData(
  userId: string
): Promise<ProfileData | null> {
  const supabase = await createClient();

  // userId comes from the URL (/profile/[id]) — validate it before it is
  // interpolated into PostgREST .or() filter strings.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
    return null;
  }

  const { data: member } = await supabase
    .from("users")
    .select(
      "id, email, full_name, role, phone_number, avatar_url, telegram_username, created_at"
    )
    .eq("id", userId)
    .single();

  if (!member) return null;

  const [payoutsRes, completedRes, activeRes, namesRes] = await Promise.all([
    supabase.from("payouts").select("amount, status").eq("user_id", userId),
    supabase
      .from("orders")
      .select(ORDER_COLUMNS)
      .eq("status", "completed")
      .or(`worker_id.eq.${userId},broker_id.eq.${userId}`),
    supabase
      .from("orders")
      .select(ORDER_COLUMNS)
      .in("status", ["in_progress", "submitted", "revision"])
      .or(`worker_id.eq.${userId},broker_id.eq.${userId}`),
    supabase.from("users").select("id, full_name"),
  ]);

  const payouts = payoutsRes.data ?? [];
  const earnings = payouts
    .filter((p) => p.status === "settled")
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const pendingBalance = payouts
    .filter((p) => p.status === "pending")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const completed = completedRes.data ?? [];
  const active = activeRes.data ?? [];

  const days = completed
    .filter((o) => o.completed_at)
    .map(
      (o) =>
        (new Date(o.completed_at!).getTime() - new Date(o.created_at).getTime()) /
        86_400_000
    );
  const avgCompletionDays =
    days.length > 0
      ? Math.round((days.reduce((a, b) => a + b, 0) / days.length) * 10) / 10
      : 0;

  const nameById = new Map(
    (namesRes.data ?? []).map((u) => [u.id, u.full_name] as const)
  );

  const isWorker = member.role === "worker";
  const peerKey = isWorker ? "broker_id" : "worker_id";
  const collabMap = new Map<string, number>();
  for (const o of completed) {
    const peerId = o[peerKey];
    if (!peerId) continue;
    collabMap.set(peerId, (collabMap.get(peerId) ?? 0) + 1);
  }
  const collaboration = Array.from(collabMap.entries())
    .map(([peerId, count]) => ({
      peer_id: peerId,
      peer_name: nameById.get(peerId) ?? "غير معروف",
      count,
    }))
    .sort((a, b) => b.count - a.count);

  const recentOrders: RecentOrder[] = [...completed, ...active]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .slice(0, 10)
    .map((o) => ({
      id: o.id,
      order_number: o.order_number,
      title: o.title,
      status: o.status,
      side: (o.worker_id === userId ? "worker" : "broker") as
        | "worker"
        | "broker",
      share: Number(o.worker_id === userId ? o.worker_share : o.broker_share),
      created_at: o.created_at,
    }));

  return {
    member: member as ProfileMember,
    earnings,
    pendingBalance,
    completedTasks: completed.length,
    activeTasks: active.length,
    avgCompletionDays,
    collaboration,
    recentOrders,
  };
}
