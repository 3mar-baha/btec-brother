"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, ShoppingBag } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useStaggeredEntrance } from "@/hooks/use-motion";
import { createClient } from "@/lib/supabase/client";
import { escapeHtml, notifyTelegramUser } from "@/lib/telegram";
import { CreateOrderModal } from "./create-order-modal";
import { EditOrderModal } from "./edit-order-modal";
import { FilterBar } from "./filter-bar";
import { OrderCard } from "./order-card";
import type {
  Classification,
  CriteriaLevel,
  MarketFilters,
  MarketOrder,
  Role,
} from "./types";

const ORDER_COLUMNS =
  "id, order_number, broker_id, title, unit_title, assignment_name, specialisation_id, grade_id, criteria_id, total_price, worker_share, deadline, status, created_at";

const PAGE_SIZE = 50;

const DEFAULT_FILTERS: MarketFilters = {
  specialisationId: "all",
  gradeId: "all",
  criteriaId: "all",
  urgency: "all",
};

interface MarketClientProps {
  initialOrders: MarketOrder[];
  specialisations: Classification[];
  gradeLevels: Classification[];
  criteriaLevels: CriteriaLevel[];
  role: Role;
  hasActiveTask: boolean;
  userName: string;
  currentUserId: string;
}

export function MarketClient({
  initialOrders,
  specialisations,
  gradeLevels,
  criteriaLevels,
  role,
  hasActiveTask: initialHasActiveTask,
  userName,
  currentUserId,
}: MarketClientProps) {
  const { toast } = useToast();
  const [supabase] = useState(() => createClient());
  const [orders, setOrders] = useState<MarketOrder[]>(initialOrders);
  const [filters, setFilters] = useState<MarketFilters>(DEFAULT_FILTERS);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [hasActiveTask, setHasActiveTask] = useState(initialHasActiveTask);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<MarketOrder | null>(null);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(initialOrders.length);

  // Server-side filtering + pagination: every market filter maps to a column
  // predicate, so the DB does the work and pages stay fast as the pool grows.
  const loadOrders = useCallback(async () => {
    let q = supabase
      .from("orders")
      .select(ORDER_COLUMNS, { count: "exact" })
      .eq("status", "open");
    if (filters.specialisationId !== "all") {
      q = q.eq("specialisation_id", Number(filters.specialisationId));
    }
    if (filters.gradeId !== "all") {
      q = q.eq("grade_id", Number(filters.gradeId));
    }
    if (filters.criteriaId !== "all") {
      q = q.eq("criteria_id", Number(filters.criteriaId));
    }
    if (filters.urgency !== "all") {
      q = q.gte("deadline", new Date().toISOString());
      const hours = filters.urgency === "urgent" ? 48 : 24 * 7;
      q = q.lte(
        "deadline",
        new Date(Date.now() + hours * 3_600_000).toISOString()
      );
    }

    const { data, count, error } = await q
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
    if (error) {
      // Keep the current list on a failed refresh (e.g. transient network
      // issue from the realtime handler) instead of wiping the market.
      toast({
        title: "تعذر تحديث قائمة الطلبات",
        variant: "destructive",
      });
      return;
    }
    setOrders(data as MarketOrder[]);
    setTotal(count ?? 0);
  }, [supabase, filters, page, toast]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    const channel = supabase
      .channel("market-orders")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => {
          void loadOrders();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, loadOrders]);

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

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));  async function handleClaim(orderId: string) {
    setClaimingId(orderId);
    const { data, error } = await supabase.rpc("claim_order", {
      p_order_id: orderId,
    });
    setClaimingId(null);

    if (error) {
      toast({
        title: "تعذر حجز المهمة",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "تم الحجز",
      description: data?.message ?? "تم حجز المهمة بنجاح",
    });
    const claimedOrder = orders.find((o) => o.id === orderId);
    if (claimedOrder) {
      notifyTelegramUser(
        claimedOrder.broker_id,
        `⚡ قام ${escapeHtml(userName)} بحجز طلبك #${claimedOrder.order_number}`
      );
    }
    setHasActiveTask(true);
    await loadOrders();
  }

  const isBroker = role === "broker";
  const gridRef = useStaggeredEntrance<HTMLDivElement>([orders]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-ink">
            سوق الطلبات
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {total} طلب متاح للحجز
          </p>
        </div>

        {isBroker && (
          <Button
            onClick={() => setCreateOpen(true)}
            className="bg-brand text-white shadow-none hover:bg-brand-pressed"
          >
            <Plus className="h-4 w-4" />
            إنشاء طلب
          </Button>
        )}
      </div>

      <FilterBar
        filters={filters}
        specialisations={specialisations}
        gradeLevels={gradeLevels}
        criteriaLevels={criteriaLevels}
        onChange={(f) => {
          setFilters(f);
          setPage(0);
        }}
      />

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-card py-16 text-center">
          <ShoppingBag className="h-8 w-8 text-ash-light" />
          <p className="text-sm text-muted-foreground">
            لا توجد طلبات مطابقة حالياً
          </p>
        </div>
      ) : (
        <>
        <div
          ref={gridRef}
          className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
        >
          {orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              specialisationName={specName(order.specialisation_id)}
              gradeName={gradeName(order.grade_id)}
              criteria={criteriaById(order.criteria_id)}
              role={role}
              disabled={hasActiveTask}
              claiming={claimingId === order.id}
              canEdit={
                order.status === "open" &&
                (role === "admin" || order.broker_id === currentUserId)
              }
              onEdit={setEditTarget}
              onClaim={handleClaim}
            />
          ))}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">
              صفحة {page + 1} من {totalPages} — {total} طلب
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
              >
                السابق
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages - 1}
                onClick={() => setPage(page + 1)}
              >
                التالي
              </Button>
            </div>
          </div>
        )}
        </>
      )}

      <CreateOrderModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        specialisations={specialisations}
        gradeLevels={gradeLevels}
        criteriaLevels={criteriaLevels}
        onCreated={loadOrders}
      />

      {editTarget && (
        <EditOrderModal
          order={{ id: editTarget.id, order_number: editTarget.order_number }}
          onOpenChange={(open) => !open && setEditTarget(null)}
          onUpdated={loadOrders}
        />
      )}
    </div>
  );
}
