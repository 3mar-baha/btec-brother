"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, ShoppingBag } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useStaggeredEntrance } from "@/hooks/use-motion";
import { createClient } from "@/lib/supabase/client";
import { escapeHtml, notifyTelegramUser } from "@/lib/telegram";
import { CreateOrderModal } from "./create-order-modal";
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
}

export function MarketClient({
  initialOrders,
  specialisations,
  gradeLevels,
  criteriaLevels,
  role,
  hasActiveTask: initialHasActiveTask,
  userName,
}: MarketClientProps) {
  const { toast } = useToast();
  const [supabase] = useState(() => createClient());
  const [orders, setOrders] = useState<MarketOrder[]>(initialOrders);
  const [filters, setFilters] = useState<MarketFilters>(DEFAULT_FILTERS);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [hasActiveTask, setHasActiveTask] = useState(initialHasActiveTask);
  const [createOpen, setCreateOpen] = useState(false);

  const loadOrders = useCallback(async () => {
    const { data, error } = await supabase
      .from("orders")
      .select(ORDER_COLUMNS)
      .eq("status", "open")
      .order("created_at", { ascending: false });
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
  }, [supabase, toast]);

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

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (
        filters.specialisationId !== "all" &&
        o.specialisation_id !== Number(filters.specialisationId)
      ) {
        return false;
      }
      if (
        filters.gradeId !== "all" &&
        o.grade_id !== Number(filters.gradeId)
      ) {
        return false;
      }
      if (
        filters.criteriaId !== "all" &&
        o.criteria_id !== Number(filters.criteriaId)
      ) {
        return false;
      }
      if (filters.urgency !== "all") {
        const diff = new Date(o.deadline).getTime() - Date.now();
        if (filters.urgency === "urgent") {
          if (diff < 0 || diff >= 48 * 3_600_000) return false;
        } else if (filters.urgency === "week") {
          if (diff < 0 || diff >= 7 * 86_400_000) return false;
        }
      }
      return true;
    });
  }, [orders, filters]);

  async function handleClaim(orderId: string) {
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
  const gridRef = useStaggeredEntrance<HTMLDivElement>([filtered]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-ink">
            سوق الطلبات
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {filtered.length} طلب متاح للحجز
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
        onChange={setFilters}
      />

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-card py-16 text-center">
          <ShoppingBag className="h-8 w-8 text-ash-light" />
          <p className="text-sm text-muted-foreground">
            لا توجد طلبات مطابقة حالياً
          </p>
        </div>
      ) : (
        <div
          ref={gridRef}
          className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
        >
          {filtered.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              specialisationName={specName(order.specialisation_id)}
              gradeName={gradeName(order.grade_id)}
              criteria={criteriaById(order.criteria_id)}
              role={role}
              disabled={hasActiveTask}
              claiming={claimingId === order.id}
              onClaim={handleClaim}
            />
          ))}
        </div>
      )}

      <CreateOrderModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        specialisations={specialisations}
        gradeLevels={gradeLevels}
        criteriaLevels={criteriaLevels}
        onCreated={loadOrders}
      />
    </div>
  );
}
