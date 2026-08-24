import { Card, CardContent } from "@/components/ui/card";
import { formatMoney } from "@/lib/format";
import type { ReportData } from "./types";

/**
 * Dependency-free CSS bar charts (no chart library): monthly revenue trend,
 * revenue distribution by specialisation, and per-broker/worker performance.
 * All data is pre-aggregated server-side in the admin page.
 */
export function ReportsPanel({ reports }: { reports: ReportData }) {
  const maxMonthly = Math.max(1, ...reports.monthly.map((m) => m.revenue));
  const maxSpec = Math.max(1, ...reports.bySpecialisation.map((s) => s.revenue));
  const hasData = reports.monthly.some((m) => m.count > 0);

  if (!hasData) {
    return (
      <Card>
        <CardContent className="p-10 text-center text-sm text-muted-foreground">
          لا توجد طلبات مكتملة بعد لتوليد التقارير — تظهر التحليلات تلقائياً بعد
          أول اكتمال.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-5">
          <h3 className="mb-4 font-display text-sm font-bold text-ink">
            الإيرادات الشهرية (الطلبات المكتملة)
          </h3>
          <div className="flex h-44 items-end gap-1.5 sm:gap-2.5">
            {reports.monthly.map((m) => (
              <div
                key={m.label}
                className="group flex min-w-0 flex-1 flex-col items-center gap-1.5"
                title={`${m.label}: ${formatMoney(m.revenue)} د.أ — ${m.count} طلب`}
              >
                <span className="text-[10px] font-medium text-charcoal opacity-0 transition-opacity group-hover:opacity-100">
                  {formatMoney(m.revenue)}
                </span>
                <div
                  className="w-full rounded-t bg-brand transition-colors group-hover:bg-brand-pressed"
                  style={{
                    height: `${Math.max(3, (m.revenue / maxMonthly) * 100)}%`,
                  }}
                />
                <span className="w-full truncate text-center text-[10px] text-ash">
                  {m.label}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <h3 className="mb-4 font-display text-sm font-bold text-ink">
              التوزيع حسب التخصص
            </h3>
            <div className="space-y-3">
              {reports.bySpecialisation.map((s) => (
                <div key={s.name}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-medium text-ink">{s.name}</span>
                    <span className="font-mono text-muted-foreground">
                      {formatMoney(s.revenue)} د.أ · {s.count} طلب
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-bone dark:bg-surface-dark">
                    <div
                      className="h-full rounded-full bg-brand"
                      style={{ width: `${(s.revenue / maxSpec) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <StaffTable title="أداء الوسطاء" rows={reports.perBroker} />
          <StaffTable title="أداء العمال" rows={reports.perWorker} />
        </div>
      </div>
    </div>
  );
}

function StaffTable({
  title,
  rows,
}: {
  title: string;
  rows: ReportData["perBroker"];
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <h3 className="mb-3 font-display text-sm font-bold text-ink">{title}</h3>
        {rows.length === 0 ? (
          <p className="text-xs text-muted-foreground">لا توجد بيانات بعد.</p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-start text-muted-foreground">
                <th className="pb-2 text-start font-medium">الاسم</th>
                <th className="pb-2 text-center font-medium">المكتمل</th>
                <th className="pb-2 text-center font-medium">متوسط الأيام</th>
                <th className="pb-2 text-end font-medium">الإيراد</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="py-2 font-medium text-ink">{r.name}</td>
                  <td className="py-2 text-center font-mono">{r.completed}</td>
                  <td className="py-2 text-center font-mono">
                    {r.avgDays.toFixed(1)}
                  </td>
                  <td className="py-2 text-end font-mono">
                    {formatMoney(r.revenue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
