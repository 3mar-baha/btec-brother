"use client";

import { History, MessageCircle, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { criteriaBadgeClass } from "@/lib/criteria";
import { formatMoney, formatDate, countdown } from "@/lib/format";
import { statusBadgeClass, statusLabel } from "@/components/workspace/labels";
import { whatsappHref } from "./aggregate";
import type { ClientAggregate, CriteriaLevel } from "./types";

interface ClientDrawerProps {
  client: ClientAggregate;
  gradeNameById: Map<number, string>;
  specNameById: Map<number, string>;
  criteriaById: Map<number, CriteriaLevel>;
  brokerName: (id: string) => string;
  canCreateOrder: boolean;
  onClose: () => void;
  onCreateOrder: (client: ClientAggregate) => void;
}

export function ClientDrawer({
  client,
  gradeNameById,
  specNameById,
  criteriaById,
  brokerName,
  canCreateOrder,
  onClose,
  onCreateOrder,
}: ClientDrawerProps) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-start">{client.name}</DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-x-3 gap-y-1 text-start">
            <span dir="ltr">{client.phone}</span>
            <span aria-hidden>·</span>
            <span>{formatMoney(client.totalValue)} د.أ</span>
            <span aria-hidden>·</span>
            <span>{client.totalOrders} طلبات</span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1 text-sm text-muted-foreground">
          {client.schools.length > 0 && <p>{client.schools.join("، ")}</p>}
          <p>
            الصفوف:{" "}
            {client.gradeIds.map((id) => gradeNameById.get(id)).filter(Boolean).join("، ") ||
              "—"}
          </p>
          <p>
            الوسطاء:{" "}
            {Array.from(new Set(client.orders.map((o) => brokerName(o.broker_id)))).join("، ") ||
              "—"}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline" className="gap-1.5">
            <a
              href={whatsappHref(client.phone)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle className="h-4 w-4" />
              واتساب
            </a>
          </Button>
          {canCreateOrder && (
            <Button
              size="sm"
              onClick={() => onCreateOrder(client)}
              className="gap-1.5 bg-brand text-white shadow-none hover:bg-brand-pressed"
            >
              <Plus className="h-4 w-4" />
              إنشاء طلب جديد لهذا العميل
            </Button>
          )}
        </div>

        <div className="space-y-3 border-t border-border pt-4">
          <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <History className="h-3.5 w-3.5" />
            سجل الطلبات ({client.orders.length})
          </p>
          {[...client.orders]
            .sort((a, b) => b.created_at.localeCompare(a.created_at))
            .map((o) => {
              const criteria = criteriaById.get(o.criteria_id);
              const cd = countdown(o.deadline);
              const isDone = o.status === "completed";
              return (
                <div
                  key={o.id}
                  className="rounded-lg border border-border bg-bone/40 p-3 dark:bg-surface-dark/60"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">
                        #{o.order_number} — {o.title}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {o.unit_title}
                        {o.assignment_name ? ` · ${o.assignment_name}` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-bold text-ink">
                      {formatMoney(Number(o.total_price))}
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <Badge
                      variant="outline"
                      className="border-transparent px-2 py-0 text-[10px]"
                    >
                      {specNameById.get(o.specialisation_id) ?? "—"}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="border-transparent px-2 py-0 text-[10px]"
                    >
                      {gradeNameById.get(o.grade_id) ?? "—"}
                    </Badge>
                    {criteria && (
                      <Badge
                        variant="outline"
                        className={`px-2 py-0 text-[10px] ${criteriaBadgeClass(criteria.code)}`}
                      >
                        {criteria.code} · {criteria.name}
                      </Badge>
                    )}
                    <Badge
                      variant="outline"
                      className={`px-2 py-0 text-[10px] ${statusBadgeClass(o.status)}`}
                    >
                      {statusLabel(o.status)}
                    </Badge>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                    <span>أُنشئ: {formatDate(o.created_at)}</span>
                    {isDone && o.completed_at ? (
                      <span>سُلّم: {formatDate(o.completed_at)}</span>
                    ) : (
                      <span className={cd.overdue ? "text-destructive" : undefined}>
                        الموعد: {formatDate(o.deadline)} ({cd.label})
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
