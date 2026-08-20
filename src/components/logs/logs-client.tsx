"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ScrollText } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { relativeTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { ACTION_LABELS, ACTION_ORDER, actionBadgeClass } from "./labels";
import type { ActivityLog, EnrichedLog, LogOrder, LogUser } from "./types";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "؟";
  if (parts.length === 1) return parts[0].slice(0, 2);
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function enrichSync(log: ActivityLog, users: LogUser[], orders: LogOrder[]): EnrichedLog {
  const actor = users.find((u) => u.id === log.actor_id);
  const order = log.order_id ? orders.find((o) => o.id === log.order_id) : undefined;
  return {
    ...log,
    actorName: actor?.full_name ?? "غير معروف",
    actorAvatar: actor?.avatar_url ?? null,
    orderNumber: order?.order_number ?? null,
  };
}

interface LogsClientProps {
  initialLogs: ActivityLog[];
  users: LogUser[];
  orders: LogOrder[];
}

export function LogsClient({ initialLogs, users, orders }: LogsClientProps) {
  const [supabase] = useState(() => createClient());
  const [logs, setLogs] = useState<EnrichedLog[]>(() =>
    initialLogs.map((l) => enrichSync(l, users, orders))
  );
  const [actionFilter, setActionFilter] = useState("all");
  const [memberFilter, setMemberFilter] = useState("all");

  const usersRef = useRef(users);
  const ordersRef = useRef(orders);
  useEffect(() => {
    usersRef.current = users;
    ordersRef.current = orders;
  }, [users, orders]);

  useEffect(() => {
    async function handleInsert(payload: { new: ActivityLog }) {
      const log = payload.new;
      let actor: LogUser | null =
        usersRef.current.find((u) => u.id === log.actor_id) ?? null;
      if (!actor) {
        const { data } = await supabase
          .from("users")
          .select("id, full_name, avatar_url")
          .eq("id", log.actor_id)
          .single();
        actor = (data as LogUser | null) ?? null;
        if (actor) usersRef.current = [...usersRef.current, actor];
      }

      let orderNumber: number | null = null;
      if (log.order_id) {
        let order: LogOrder | null =
          ordersRef.current.find((o) => o.id === log.order_id) ?? null;
        if (!order) {
          const { data } = await supabase
            .from("orders")
            .select("id, order_number")
            .eq("id", log.order_id)
            .single();
          order = (data as LogOrder | null) ?? null;
          if (order) ordersRef.current = [...ordersRef.current, order];
        }
        orderNumber = order?.order_number ?? null;
      }

      const enriched: EnrichedLog = {
        ...log,
        actorName: actor?.full_name ?? "غير معروف",
        actorAvatar: actor?.avatar_url ?? null,
        orderNumber,
      };
      setLogs((prev) => [enriched, ...prev.filter((l) => l.id !== log.id)]);
    }

    const channel = supabase
      .channel("activity-logs-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "activity_logs" },
        handleInsert
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase]);

  const filtered = useMemo(() => {
    return logs.filter((l) => {
      if (actionFilter !== "all" && l.action !== actionFilter) return false;
      if (memberFilter !== "all" && l.actor_id !== memberFilter) return false;
      return true;
    });
  }, [logs, actionFilter, memberFilter]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            نوع النشاط
          </span>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الأنشطة</SelectItem>
              {ACTION_ORDER.map((a) => (
                <SelectItem key={a} value={a}>
                  {ACTION_LABELS[a]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            العضو
          </span>
          <Select value={memberFilter} onValueChange={setMemberFilter}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الأعضاء</SelectItem>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 border-dashed bg-card p-10 text-center">
          <ScrollText className="h-8 w-8 text-ash-light" />
          <p className="text-sm text-muted-foreground">لا توجد أنشطة مطابقة.</p>
        </Card>
      ) : (
        <ol className="space-y-3">
          {filtered.map((log) => (
            <li
              key={log.id}
              className="flex items-start gap-3 rounded-lg border border-border bg-card p-4"
            >
              <Avatar className="h-9 w-9 border border-border">
                <AvatarImage
                  src={log.actorAvatar ?? undefined}
                  alt={log.actorName}
                />
                <AvatarFallback className="bg-bone text-xs font-semibold text-ink">
                  {initials(log.actorName)}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-ink">
                      {log.actorName}
                    </span>
                    <Badge
                      className={cn("border-0", actionBadgeClass(log.action))}
                    >
                      {ACTION_LABELS[log.action] ?? log.action}
                    </Badge>
                  </div>
                  <span className="font-mono text-xs text-ash">
                    {relativeTime(log.created_at)}
                  </span>
                </div>

                {log.details && (
                  <p className="mt-1 text-sm text-body">{log.details}</p>
                )}

                {log.orderNumber !== null && (
                  <span className="mt-2 inline-flex items-center rounded-full bg-bone px-2.5 py-0.5 font-mono text-xs text-charcoal">
                    #{log.orderNumber}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
