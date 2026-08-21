"use client";

import {
  CheckCircle2,
  ExternalLink,
  Loader2,
  MessageSquare,
} from "lucide-react";

import type { CriteriaLevel } from "@/components/market/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useCardMotion } from "@/hooks/use-motion";
import { criteriaBadgeClass } from "@/lib/criteria";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { statusBadgeClass, statusLabel } from "./labels";
import type { WorkerProfile, WorkspaceOrder } from "./types";

interface BrokerOrderCardProps {
  order: WorkspaceOrder;
  specialisationName: string;
  gradeName: string;
  criteria: CriteriaLevel | undefined;
  worker: WorkerProfile | null;
  latestUpdate: string | null;
  approving: boolean;
  onApprove: (id: string) => void;
  onRequestRevision: (order: WorkspaceOrder) => void;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "؟";
  if (parts.length === 1) return parts[0].slice(0, 2);
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function BrokerOrderCard({
  order,
  specialisationName,
  gradeName,
  criteria,
  worker,
  latestUpdate,
  approving,
  onApprove,
  onRequestRevision,
}: BrokerOrderCardProps) {
  const code = criteria?.code ?? "";
  const isSubmitted = order.status === "submitted";
  const { ref: cardRef, ...hoverHandlers } = useCardMotion<HTMLDivElement>();

  return (
    <Card ref={cardRef} {...hoverHandlers} className="flex flex-col gap-4 p-5">
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
        <span className="text-xs text-ash">{formatDate(order.deadline)}</span>
      </div>

      <div>
        <h3 className="font-display text-lg font-bold leading-tight text-ink">
          {order.title}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {specialisationName} · {gradeName}
        </p>
        <p className="mt-2 text-sm text-body">
          {order.unit_title} — {order.assignment_name}
        </p>
      </div>

      {isSubmitted ? (
        <div className="space-y-4">
          <div className="rounded-lg bg-surface-dark p-4 text-white">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-white/60">نسبة الاقتباس</p>
                <p className="font-mono text-lg font-semibold">
                  {order.plagiarism_rate !== null
                    ? `${order.plagiarism_rate}%`
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-white/60">الذكاء الاصطناعي</p>
                <p className="font-mono text-lg font-semibold">
                  {order.ai_percentage !== null
                    ? `${order.ai_percentage}%`
                    : "—"}
                </p>
              </div>
            </div>
            {order.submission_url && (
              <a
                href={order.submission_url}
                target="_blank"
                rel="noreferrer"
                className="mt-4 flex items-center gap-2 text-sm text-white/90 underline-offset-4 hover:underline"
              >
                <ExternalLink className="h-4 w-4" />
                فتح رابط التسليم
              </a>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => onRequestRevision(order)}
            >
              <MessageSquare className="h-4 w-4" />
              طلب تعديل
            </Button>
            <Button
              disabled={approving}
              className="bg-ink text-background shadow-none hover:opacity-90"
              onClick={() => onApprove(order.id)}
            >
              {approving ? (
                <Loader2 className="animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  اعتماد واكتمال
                </>
              )}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9 border border-border">
              <AvatarImage
                src={worker?.avatar_url ?? undefined}
                alt={worker?.full_name ?? "عامل"}
              />
              <AvatarFallback className="bg-bone text-xs font-semibold text-ink">
                {initials(worker?.full_name ?? "عامل")}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium text-ink">
                {worker?.full_name ?? "عامل غير معروف"}
              </p>
              <p className="text-xs text-ash">آخر تحديث</p>
            </div>
          </div>

          {latestUpdate ? (
            <p className="rounded-lg bg-bone p-3 text-sm text-body">
              {latestUpdate}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">لا توجد تحديثات بعد.</p>
          )}

          {order.revision_notes && (
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs font-semibold text-charcoal">
                ملاحظات التعديل المرسلة
              </p>
              <p className="mt-1 text-sm text-body">{order.revision_notes}</p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
