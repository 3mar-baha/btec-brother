import { Card } from "@/components/ui/card";
import { formatMoney } from "@/lib/format";
import type { ProfileData } from "@/lib/profile";

export function MetricsGrid({ data }: { data: ProfileData }) {
  const metrics = [
    { label: "الأرباح", value: `${formatMoney(data.earnings)} د.أ` },
    { label: "الرصيد المعلق", value: `${formatMoney(data.pendingBalance)} د.أ` },
    { label: "المهام المكتملة", value: String(data.completedTasks) },
    { label: "المهام النشطة", value: String(data.activeTasks) },
    { label: "متوسط أيام الإنجاز", value: `${data.avgCompletionDays} يوم` },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {metrics.map((m) => (
        <Card key={m.label} className="p-4">
          <p className="text-xs text-ash">{m.label}</p>
          <p className="mt-2 font-mono text-xl font-semibold text-ink sm:text-2xl">
            {m.value}
          </p>
        </Card>
      ))}
    </div>
  );
}
