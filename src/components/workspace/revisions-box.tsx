"use client";

import type { CriteriaLevel } from "@/components/market/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { criteriaBadgeClass } from "@/lib/criteria";
import { formatDate, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Send } from "lucide-react";
import { statusBadgeClass, statusLabel } from "./labels";
import type { WorkspaceOrder } from "./types";

interface RevisionsBoxProps {
  revisions: WorkspaceOrder[];
  specName: (id: number) => string;
  gradeName: (id: number) => string;
  criteriaById: (id: number) => CriteriaLevel | undefined;
  onOpenSubmit: (order: WorkspaceOrder) => void;
}

export function RevisionsBox({
  revisions,
  specName,
  gradeName,
  criteriaById,
  onOpenSubmit,
}: RevisionsBoxProps) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-display text-lg font-bold text-ink">
          تعديلات مطلوبة
        </h2>
        <p className="text-xs text-ash">
          لا تحجب التعديلات حجز مهمة جديدة من السوق.
        </p>
      </div>

      {revisions.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          لا توجد تعديلات مطلوبة حالياً.
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {revisions.map((order) => {
            const criteria = criteriaById(order.criteria_id);
            const code = criteria?.code ?? "";
            return (
              <Card key={order.id} className="flex flex-col gap-4 p-5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {code && (
                      <Badge className={cn("border-0", criteriaBadgeClass(code))}>
                        {criteria?.name ?? code}
                      </Badge>
                    )}
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
                  <span className="text-xs text-ash">
                    {formatDate(order.deadline)}
                  </span>
                </div>

                <div>
                  <h3 className="font-display text-lg font-bold leading-tight text-ink">
                    {order.title}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {specName(order.specialisation_id)} ·{" "}
                    {gradeName(order.grade_id)}
                  </p>
                  <p className="mt-1 text-sm text-body">
                    {order.unit_title} — {order.assignment_name}
                  </p>
                </div>

                {order.revision_notes && (
                  <div className="rounded-lg bg-bone p-3">
                    <p className="text-xs font-semibold text-charcoal">
                      ملاحظات الوسيط
                    </p>
                    <p className="mt-1 text-sm text-body">
                      {order.revision_notes}
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between border-t border-border pt-4">
                  <p className="font-mono text-sm font-semibold text-ink">
                    {formatMoney(order.worker_share)} د.أ
                  </p>
                  <Button
                    size="sm"
                    className="bg-ink text-background shadow-none hover:opacity-90"
                    onClick={() => onOpenSubmit(order)}
                  >
                    <Send className="h-4 w-4" />
                    تسليم الحل المعدل
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
