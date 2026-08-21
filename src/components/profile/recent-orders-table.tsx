import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatMoney } from "@/lib/format";
import type { RecentOrder } from "@/lib/profile";

const STATUS_LABELS: Record<string, string> = {
  open: "مفتوح",
  in_progress: "قيد التنفيذ",
  submitted: "تم التسليم",
  revision: "تعديل",
  completed: "مكتمل",
  cancelled: "ملغي",
};

export function RecentOrdersTable({ orders }: { orders: RecentOrder[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-start">الطلب</TableHead>
            <TableHead className="text-start">الصفة</TableHead>
            <TableHead className="text-start">الحالة</TableHead>
            <TableHead className="text-start">الحصة</TableHead>
            <TableHead className="text-start">التاريخ</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={5}
                className="py-6 text-center text-muted-foreground"
              >
                لا توجد طلبات بعد.
              </TableCell>
            </TableRow>
          ) : (
            orders.map((o) => (
              <TableRow key={o.id}>
                <TableCell>
                  <span className="block font-mono text-xs text-ash" dir="ltr">
                    #{o.order_number}
                  </span>
                  <span className="mt-0.5 block max-w-[240px] truncate text-sm text-ink">
                    {o.title}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="px-2 py-0 text-[10px]">
                    {o.side === "worker" ? "عامل" : "وسيط"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="px-2 py-0 text-[10px]">
                    {STATUS_LABELS[o.status] ?? o.status}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-sm text-ink">
                  {formatMoney(o.share)} د.أ
                </TableCell>
                <TableCell className="font-mono text-xs text-ash">
                  {formatDate(o.created_at)}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
