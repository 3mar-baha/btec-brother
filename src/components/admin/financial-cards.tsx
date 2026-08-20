import { Card } from "@/components/ui/card";
import { formatMoney } from "@/lib/format";
import type { FinancialSummary } from "./types";

export function FinancialCards({ summary }: { summary: FinancialSummary }) {
  const cards = [
    { label: "إجمالي قيمة الطلبات", value: summary.grossRevenue },
    { label: "إجمالي أرباح العمال (80%)", value: summary.workerEarnings },
    { label: "إجمالي عمولات الوسطاء (20%)", value: summary.brokerCommissions },
    { label: "مستحقات جاهزة للتحويل", value: summary.pendingPayouts },
    { label: "إجمالي ما تم تحويله", value: summary.settledPayouts },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {cards.map((c) => (
        <Card key={c.label} className="p-4">
          <p className="text-xs text-ash">{c.label}</p>
          <p className="mt-2 font-mono text-lg font-semibold text-ink">
            {formatMoney(c.value)} د.أ
          </p>
        </Card>
      ))}
    </div>
  );
}
