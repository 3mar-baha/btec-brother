"use client";

import { AnimatedNumber } from "@/components/ui/animated-number";
import { Card } from "@/components/ui/card";
import { formatMoney } from "@/lib/format";
import type { ProfileData } from "@/lib/profile";

const int = (n: number) => String(Math.round(n));
const oneDecimal = (n: number) => String(Math.round(n * 10) / 10);

export function MetricsGrid({ data }: { data: ProfileData }) {
  const metrics = [
    { label: "الأرباح", value: data.earnings, format: formatMoney, suffix: "د.أ" },
    {
      label: "الرصيد المعلق",
      value: data.pendingBalance,
      format: formatMoney,
      suffix: "د.أ",
    },
    { label: "المهام المكتملة", value: data.completedTasks, format: int },
    { label: "المهام النشطة", value: data.activeTasks, format: int },
    {
      label: "متوسط أيام الإنجاز",
      value: data.avgCompletionDays,
      format: oneDecimal,
      suffix: "يوم",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {metrics.map((m) => (
        <Card key={m.label} className="p-4">
          <p className="text-xs text-ash">{m.label}</p>
          <p className="mt-2 font-mono text-xl font-semibold text-ink sm:text-2xl">
            <AnimatedNumber value={m.value} format={m.format} />
            {m.suffix ? ` ${m.suffix}` : ""}
          </p>
        </Card>
      ))}
    </div>
  );
}
