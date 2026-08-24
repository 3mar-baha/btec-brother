"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Clock,
  Download,
  FileText,
  Loader2,
  MessageSquare,
  Send,
} from "lucide-react";

import type { CriteriaLevel } from "@/components/market/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useEntrance, usePulse, useSpringPress } from "@/hooks/use-motion";
import { criteriaBadgeClass } from "@/lib/criteria";
import { countdown, formatDate, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { statusBadgeClass, statusLabel } from "./labels";
import type { Attachment, DailyUpdate, WorkspaceOrder } from "./types";

interface ActiveTaskCardProps {
  order: WorkspaceOrder;
  specialisationName: string;
  gradeName: string;
  criteria: CriteriaLevel | undefined;
  attachments: Attachment[];
  updates: DailyUpdate[];
  addingUpdate: boolean;
  onAddUpdate: (note: string) => Promise<boolean>;
  onOpenSubmit: () => void;
  onOpenDrop: () => void;
}

export function ActiveTaskCard({
  order,
  specialisationName,
  gradeName,
  criteria,
  attachments,
  updates,
  addingUpdate,
  onAddUpdate,
  onOpenSubmit,
  onOpenDrop,
}: ActiveTaskCardProps) {
  const [now, setNow] = useState<Date>(() => new Date());
  const [note, setNote] = useState("");

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const timer = countdown(order.deadline, now);
  const code = criteria?.code ?? "";
  const cardRef = useEntrance<HTMLDivElement>();
  const urgentRef = usePulse<HTMLSpanElement>(timer.urgent);
  const { ref: submitRef, ...submitHandlers } =
    useSpringPress<HTMLButtonElement>();

  async function handleAddUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const text = note.trim();
    if (!text) return;
    const ok = await onAddUpdate(text);
    // Clear only on success so a failed insert never loses the typed note.
    if (ok) setNote("");
  }

  return (
    <Card ref={cardRef} className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-canvas px-5 py-4">
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

      <div className="flex flex-col gap-6 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-bold leading-tight text-ink">
              {order.title}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {specialisationName} · {gradeName}
            </p>
            <p className="mt-2 text-sm text-body">
              {order.unit_title} — {order.assignment_name}
            </p>
          </div>
          <div className="text-start">
            <p className="text-xs text-muted-foreground">حصة العامل</p>
            <p className="font-mono text-xl font-semibold text-ink">
              {formatMoney(order.worker_share)} د.أ
            </p>
            <p className="mt-0.5 text-xs text-ash">
              الإجمالي: {formatMoney(order.total_price)} د.أ
            </p>
          </div>
        </div>

        <section className="space-y-3">
          <SectionTitle icon={<FileText className="h-4 w-4" />} title="المرفقات" />
          {attachments.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا توجد مرفقات.</p>
          ) : (
            <ul className="space-y-2">
              {attachments.map((a) => (
                <li
                  key={a.id}
                  className="flex items-start gap-3 rounded-lg border border-border p-3"
                >
                  <FileText className="mt-0.5 h-4 w-4 shrink-0 text-ash" />
                  <div className="min-w-0 flex-1">
                    <a
                      href={a.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 text-sm font-medium text-ink underline-offset-4 hover:underline"
                    >
                      {a.file_name}
                      <Download className="h-3.5 w-3.5 text-ash" />
                    </a>
                    {a.comment && (
                      <p className="mt-1 text-xs text-ash">{a.comment}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-3">
          <SectionTitle
            icon={<MessageSquare className="h-4 w-4" />}
            title="التحديثات اليومية"
          />
          {updates.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا توجد تحديثات بعد.</p>
          ) : (
            <ul className="space-y-3">
              {updates.map((u) => (
                <li key={u.id} className="text-sm">
                  <p className="text-body">{u.note}</p>
                  <p className="mt-0.5 font-mono text-xs text-ash">
                    {formatDate(u.created_at)}
                  </p>
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={handleAddUpdate} className="flex flex-col gap-2">
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="أضف تحديثاً جديداً..."
              rows={2}
            />
            <div className="flex justify-end">
              <Button
                type="submit"
                size="sm"
                disabled={addingUpdate || !note.trim()}
                className="bg-ink text-background shadow-none hover:opacity-90"
              >
                {addingUpdate ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    إضافة تحديث
                  </>
                )}
              </Button>
            </div>
          </form>
        </section>
      </div>

      <Separator />

      <div className="flex flex-wrap items-center justify-end gap-3 p-5">
        <Button
          variant="outline"
          className="border-destructive/40 text-destructive hover:bg-destructive/5 hover:text-destructive"
          onClick={onOpenDrop}
        >
          <AlertTriangle className="h-4 w-4" />
          اعتذار وتنازل
        </Button>
        <Button
          ref={submitRef}
          {...submitHandlers}
          className="bg-ink text-background shadow-none hover:opacity-90"
          onClick={onOpenSubmit}
        >
          <Send className="h-4 w-4" />
          تسليم الحل
        </Button>
      </div>
    </Card>
  );
}

function SectionTitle({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <h3 className="flex items-center gap-2 font-display text-sm font-bold text-ink">
      {icon}
      {title}
    </h3>
  );
}
