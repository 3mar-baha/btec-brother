"use client";

import { useEffect, useState } from "react";
import { Clock, Loader2, Pencil } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useHoverLift, usePulse, useSpringPress } from "@/hooks/use-motion";
import { criteriaBadgeClass } from "@/lib/criteria";
import { countdown, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CriteriaLevel, MarketOrder, Role } from "./types";

interface OrderCardProps {
  order: MarketOrder;
  specialisationName: string;
  gradeName: string;
  criteria: CriteriaLevel | undefined;
  role: Role;
  disabled: boolean;
  claiming: boolean;
  canEdit?: boolean;
  onClaim: (id: string) => void;
  onEdit?: (order: MarketOrder) => void;
}

export function OrderCard({
  order,
  specialisationName,
  gradeName,
  criteria,
  role,
  disabled,
  claiming,
  canEdit,
  onClaim,
  onEdit,
}: OrderCardProps) {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const timer = countdown(order.deadline, now);
  const code = criteria?.code ?? "";
  const urgentRef = usePulse<HTMLSpanElement>(timer.urgent);
  const { ref: claimRef, ...claimHandlers } =
    useSpringPress<HTMLButtonElement>();
  const { ref: cardRef, ...hoverHandlers } = useHoverLift<HTMLDivElement>();

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
          {canEdit && onEdit && (
            <button
              onClick={() => onEdit(order)}
              aria-label={`تعديل الطلب #${order.order_number}`}
              className="rounded-full p-1 text-ash transition-colors hover:bg-bone hover:text-ink"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <span
          ref={urgentRef}
          className={cn(
            "flex items-center gap-1 font-mono text-xs",
            timer.overdue
              ? "text-destructive"
              : timer.urgent
                ? "text-brand-pressed"
                : "text-ash"
          )}
        >
          <Clock className="h-3.5 w-3.5" />
          {timer.label}
        </span>
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

      <div className="mt-auto flex items-end justify-between gap-3 border-t border-border pt-4">
        <div>
          <p className="text-xs text-muted-foreground">السعر الإجمالي</p>
          <p className="font-mono text-lg font-semibold text-ink">
            {formatMoney(order.total_price)} د.أ
          </p>
          <p className="mt-0.5 text-xs text-ash">
            حصة العامل:{" "}
            <span className="font-mono font-medium text-ink">
              {formatMoney(order.worker_share)} د.أ
            </span>
          </p>
        </div>

        {role === "worker" && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button
                  ref={claimRef}
                  {...claimHandlers}
                  size="sm"
                  disabled={disabled || claiming}
                  onClick={() => onClaim(order.id)}
                  className="bg-ink text-background shadow-none hover:opacity-90"
                >
                  {claiming ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    "احجز المهمة"
                  )}
                </Button>
              </span>
            </TooltipTrigger>
            {disabled && (
              <TooltipContent className="bg-ink text-background">
                لديك مهمة نشطة حالياً ولا يمكنك حجز مهمة جديدة
              </TooltipContent>
            )}
          </Tooltip>
        )}
      </div>
    </Card>
  );
}
