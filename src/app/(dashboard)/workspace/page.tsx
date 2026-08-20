import { redirect } from "next/navigation";

import type {
  Classification,
  CriteriaLevel,
  Role,
} from "@/components/market/types";
import { WorkspaceClient } from "@/components/workspace/workspace-client";
import type {
  Attachment,
  DailyUpdate,
  WorkerProfile,
  WorkspaceOrder,
} from "@/components/workspace/types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ORDER_COLUMNS =
  "id, order_number, broker_id, worker_id, title, specialisation_id, grade_id, criteria_id, unit_title, assignment_name, total_price, worker_share, broker_share, deadline, status, submission_url, plagiarism_rate, ai_percentage, revision_notes, created_at";

export default async function WorkspacePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  const role = (profile?.role ?? "worker") as Role;
  const userName = profile?.full_name ?? "";

  const [specsRes, gradesRes, criteriaRes] = await Promise.all([
    supabase.from("specialisations").select("id, name").order("id"),
    supabase.from("grade_levels").select("id, name").order("id"),
    supabase.from("criteria_levels").select("id, code, name").order("id"),
  ]);

  let activeTask: WorkspaceOrder | null = null;
  let revisions: WorkspaceOrder[] = [];
  let attachments: Attachment[] = [];
  let updates: DailyUpdate[] = [];
  let ongoingOrders: WorkspaceOrder[] = [];
  let workerProfiles: WorkerProfile[] = [];
  let brokerUpdates: DailyUpdate[] = [];

  if (role === "worker") {
    const [activeRes, revisionsRes] = await Promise.all([
      supabase
        .from("orders")
        .select(ORDER_COLUMNS)
        .eq("worker_id", user.id)
        .eq("status", "in_progress")
        .order("created_at", { ascending: false })
        .limit(1),
      supabase
        .from("orders")
        .select(ORDER_COLUMNS)
        .eq("worker_id", user.id)
        .eq("status", "revision")
        .order("created_at", { ascending: false }),
    ]);

    activeTask = (activeRes.data?.[0] ?? null) as WorkspaceOrder | null;
    revisions = (revisionsRes.data ?? []) as WorkspaceOrder[];

    if (activeTask) {
      const [attRes, updRes] = await Promise.all([
        supabase
          .from("order_attachments")
          .select("*")
          .eq("order_id", activeTask.id)
          .order("created_at"),
        supabase
          .from("daily_updates")
          .select("*")
          .eq("order_id", activeTask.id)
          .order("created_at"),
      ]);
      attachments = (attRes.data ?? []) as Attachment[];
      updates = (updRes.data ?? []) as DailyUpdate[];
    }
  } else {
    const ordersRes = await supabase
      .from("orders")
      .select(ORDER_COLUMNS)
      .eq("broker_id", user.id)
      .in("status", ["in_progress", "submitted", "revision"])
      .order("created_at", { ascending: false });

    ongoingOrders = (ordersRes.data ?? []) as WorkspaceOrder[];

    if (ongoingOrders.length > 0) {
      const orderIds = ongoingOrders.map((o) => o.id);
      const workerIds = Array.from(
        new Set(
          ongoingOrders
            .map((o) => o.worker_id)
            .filter((id): id is string => Boolean(id))
        )
      );

      const [workersRes, updatesRes] = await Promise.all([
        supabase
          .from("users")
          .select("id, full_name, avatar_url")
          .in("id", workerIds),
        supabase
          .from("daily_updates")
          .select("*")
          .in("order_id", orderIds)
          .order("created_at"),
      ]);

      workerProfiles = (workersRes.data ?? []) as WorkerProfile[];
      brokerUpdates = (updatesRes.data ?? []) as DailyUpdate[];
    }
  }

  return (
    <WorkspaceClient
      role={role}
      specialisations={(specsRes.data ?? []) as Classification[]}
      gradeLevels={(gradesRes.data ?? []) as Classification[]}
      criteriaLevels={(criteriaRes.data ?? []) as CriteriaLevel[]}
      activeTask={activeTask}
      revisions={revisions}
      activeAttachments={attachments}
      activeUpdates={updates}
      ongoingOrders={ongoingOrders}
      workerProfiles={workerProfiles}
      brokerUpdates={brokerUpdates}
      userName={userName}
    />
  );
}
