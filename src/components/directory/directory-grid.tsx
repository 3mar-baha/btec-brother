"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Award } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CollaborationRow, DirectoryMember } from "./types";

const ROLE_LABELS: Record<string, string> = {
  admin: "مدير",
  broker: "وسيط",
  worker: "عامل",
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "؟";
  if (parts.length === 1) return parts[0].slice(0, 2);
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function achievements(m: DirectoryMember): string[] {
  const tags: string[] = [];
  if (m.completed > 0 && m.on_time === m.completed) tags.push("ملتزم بالوقت");
  if (m.precise >= 3) tags.push("دقيق");
  if (m.urgent >= 1) tags.push("منقذ");
  return tags;
}

export function DirectoryGrid({
  members,
  matrix,
  isAdmin,
}: {
  members: DirectoryMember[];
  matrix: CollaborationRow[];
  isAdmin: boolean;
}) {
  const matrixByWorker = useMemo(() => {
    const map = new Map<string, CollaborationRow[]>();
    for (const row of matrix) {
      const arr = map.get(row.worker_id) ?? [];
      arr.push(row);
      map.set(row.worker_id, arr);
    }
    return map;
  }, [matrix]);

  if (members.length === 0) {
    return (
      <Card className="p-10 text-center text-sm text-muted-foreground">
        لا يوجد أعضاء بعد.
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {members.map((m) => {
        const tags = achievements(m);
        const collab = matrixByWorker.get(m.id) ?? [];

        const card = (
          <Card className="flex h-full flex-col gap-4 p-5">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12 border border-border">
                <AvatarImage src={m.avatar_url ?? undefined} alt={m.full_name} />
                <AvatarFallback className="bg-bone text-sm font-semibold text-ink">
                  {initials(m.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <h3 className="truncate font-display text-base font-bold text-ink">
                  {m.full_name}
                </h3>
                <div className="mt-1 flex items-center gap-1.5">
                  <Badge variant="secondary" className="px-2 py-0 text-[10px]">
                    {ROLE_LABELS[m.role] ?? m.role}
                  </Badge>
                  {!m.is_active && (
                    <Badge
                      variant="outline"
                      className="border-0 bg-ink/5 px-2 py-0 text-[10px] text-ash"
                    >
                      غير نشط
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Stat label="مهام مكتملة" value={String(m.completed)} />
              <Stat label="مهام نشطة" value={String(m.active)} />
              <Stat
                label="إجمالي الأرباح"
                value={`${formatMoney(m.earnings)} د.أ`}
              />
              <Stat label="متوسط الإنجاز" value={`${m.avg_days} يوم`} />
            </div>

            {tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <Award className="h-3.5 w-3.5 text-brand-pressed" />
                {tags.map((t) => (
                  <Badge
                    key={t}
                    className={cn(
                      "border-0 bg-brand/10 px-2 py-0.5 text-[11px] text-brand-pressed"
                    )}
                  >
                    {t}
                  </Badge>
                ))}
              </div>
            )}

            {m.role === "worker" && collab.length > 0 && (
              <p className="border-t border-border pt-3 text-xs leading-relaxed text-ash">
                {m.full_name.split(/\s+/)[0]} أنجز:{" "}
                {collab.map((c, i) => (
                  <span key={c.broker_id}>
                    {i > 0 && " و"}
                    <span className="font-mono font-medium text-ink">
                      {c.count}
                    </span>{" "}
                    طلباً للوسيط {c.broker_name}
                  </span>
                ))}
              </p>
            )}
          </Card>
        );

        if (!isAdmin) {
          return <div key={m.id}>{card}</div>;
        }

        return (
          <Link
            key={m.id}
            href={`/profile/${m.id}`}
            className="block transition-opacity hover:opacity-90"
          >
            {card}
          </Link>
        );
      })}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-bone/60 px-3 py-2">
      <p className="text-[11px] text-ash">{label}</p>
      <p className="mt-0.5 font-mono text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}
