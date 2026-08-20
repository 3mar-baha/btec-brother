import { AlertTriangle, Clock, Loader2, RotateCcw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { statusBadgeClass, statusLabel } from "@/components/workspace/labels";
import type { StuckOrder } from "./types";

export function EmergencyControl({
  orders,
  reassigningId,
  onReassign,
}: {
  orders: StuckOrder[];
  reassigningId: string | null;
  onReassign: (id: string) => void;
}) {
  if (orders.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-2 border-dashed bg-card p-10 text-center">
        <Clock className="h-8 w-8 text-ash-light" />
        <p className="text-sm text-muted-foreground">
          لا توجد مهام عالقة تجاوزت موعدها النهائي.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {orders.map((order) => (
        <Card key={order.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-ash">
                #{order.order_number}
              </span>
              <Badge
                variant="outline"
                className={cn("border-0", statusBadgeClass(order.status))}
              >
                {statusLabel(order.status)}
              </Badge>
            </div>
            <h3 className="mt-1 font-display text-base font-bold leading-tight text-ink">
              {order.title}
            </h3>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ash">
              <span>العامل: {order.worker_name ?? "غير معروف"}</span>
              <span className="flex items-center gap-1 text-destructive">
                <AlertTriangle className="h-3.5 w-3.5" />
                متأخر — {formatDate(order.deadline)}
              </span>
            </div>
          </div>

          <Button
            variant="outline"
            disabled={reassigningId === order.id}
            onClick={() => onReassign(order.id)}
            className="border-destructive/40 text-destructive hover:bg-destructive/5 hover:text-destructive"
          >
            {reassigningId === order.id ? (
              <Loader2 className="animate-spin" />
            ) : (
              <RotateCcw className="h-4 w-4" />
            )}
            سحب وإعادة طرح
          </Button>
        </Card>
      ))}
    </div>
  );
}
