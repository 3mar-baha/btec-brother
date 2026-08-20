"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardCheck, FolderOpen } from "lucide-react";

import type { Classification, CriteriaLevel } from "@/components/market/types";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { formatMoney } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import { notifyTelegramUser } from "@/lib/telegram";
import { BrokerOrderCard } from "./broker-order-card";
import { RequestRevisionModal } from "./request-revision-modal";
import type { DailyUpdate, WorkerProfile, WorkspaceOrder } from "./types";

interface BrokerWorkspaceProps {
  specialisations: Classification[];
  gradeLevels: Classification[];
  criteriaLevels: CriteriaLevel[];
  orders: WorkspaceOrder[];
  workerProfiles: WorkerProfile[];
  updates: DailyUpdate[];
}

export function BrokerWorkspace({
  specialisations,
  gradeLevels,
  criteriaLevels,
  orders,
  workerProfiles,
  updates,
}: BrokerWorkspaceProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [revisionTarget, setRevisionTarget] = useState<WorkspaceOrder | null>(
    null
  );

  const specName = useMemo(() => {
    const map = new Map(specialisations.map((s) => [s.id, s.name]));
    return (id: number) => map.get(id) ?? "";
  }, [specialisations]);

  const gradeName = useMemo(() => {
    const map = new Map(gradeLevels.map((g) => [g.id, g.name]));
    return (id: number) => map.get(id) ?? "";
  }, [gradeLevels]);

  const criteriaById = useMemo(() => {
    const map = new Map(criteriaLevels.map((c) => [c.id, c]));
    return (id: number) => map.get(id);
  }, [criteriaLevels]);

  const workerById = useMemo(() => {
    const map = new Map(workerProfiles.map((w) => [w.id, w]));
    return (id: string | null) => (id ? map.get(id) ?? null : null);
  }, [workerProfiles]);

  const latestUpdateByOrder = useMemo(() => {
    const map = new Map<string, string>();
    for (const u of updates) map.set(u.order_id, u.note);
    return (id: string) => map.get(id) ?? null;
  }, [updates]);

  const underExecution = orders.filter(
    (o) => o.status === "in_progress" || o.status === "revision"
  );
  const submitted = orders.filter((o) => o.status === "submitted");

  async function handleApprove(orderId: string) {
    setApprovingId(orderId);
    const { data, error } = await supabase.rpc("approve_and_complete_order", {
      p_order_id: orderId,
    });
    setApprovingId(null);

    if (error) {
      toast({
        title: "تعذر الاعتماد",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "تم الاعتماد",
      description: data?.message ?? "تم اعتماد المهمة واكتمالها",
    });
    const completedOrder = orders.find((o) => o.id === orderId);
    if (completedOrder) {
      if (completedOrder.worker_id) {
        notifyTelegramUser(
          completedOrder.worker_id,
          `🎉 تم اعتماد الطلب #${completedOrder.order_number} وإيداع نصيبك: ${formatMoney(
            completedOrder.worker_share
          )} د.أ`
        );
      }
      notifyTelegramUser(
        completedOrder.broker_id,
        `🎉 تم اعتماد الطلب #${completedOrder.order_number} وإيداع عمولتك: ${formatMoney(
          completedOrder.broker_share
        )} د.أ`
      );
    }
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink">
          لوحة العمل
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          متابعة الطلبات قيد التنفيذ ومراجعة التسليمات
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold text-ink">
          طلبات قيد التنفيذ
        </h2>
        {underExecution.length === 0 ? (
          <EmptyState icon={<FolderOpen className="h-8 w-8" />} text="لا توجد طلبات قيد التنفيذ حالياً." />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {underExecution.map((order) => (
              <BrokerOrderCard
                key={order.id}
                order={order}
                specialisationName={specName(order.specialisation_id)}
                gradeName={gradeName(order.grade_id)}
                criteria={criteriaById(order.criteria_id)}
                worker={workerById(order.worker_id)}
                latestUpdate={latestUpdateByOrder(order.id)}
                approving={approvingId === order.id}
                onApprove={handleApprove}
                onRequestRevision={setRevisionTarget}
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold text-ink">
          طلبات بانتظار المراجعة
        </h2>
        {submitted.length === 0 ? (
          <EmptyState icon={<ClipboardCheck className="h-8 w-8" />} text="لا توجد تسليمات بانتظار المراجعة." />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {submitted.map((order) => (
              <BrokerOrderCard
                key={order.id}
                order={order}
                specialisationName={specName(order.specialisation_id)}
                gradeName={gradeName(order.grade_id)}
                criteria={criteriaById(order.criteria_id)}
                worker={workerById(order.worker_id)}
                latestUpdate={latestUpdateByOrder(order.id)}
                approving={approvingId === order.id}
                onApprove={handleApprove}
                onRequestRevision={setRevisionTarget}
              />
            ))}
          </div>
        )}
      </section>

      {revisionTarget && (
        <RequestRevisionModal
          open
          onOpenChange={(open) => {
            if (!open) setRevisionTarget(null);
          }}
          order={revisionTarget}
          onRequested={() => {
            setRevisionTarget(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <Card className="flex flex-col items-center gap-2 border-dashed bg-card p-10 text-center">
      <span className="text-ash-light">{icon}</span>
      <p className="text-sm text-muted-foreground">{text}</p>
    </Card>
  );
}
