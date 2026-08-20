import { Banknote } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMoney } from "@/lib/format";
import type { LedgerRow } from "./types";

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

export function MemberLedger({
  rows,
  onSettle,
}: {
  rows: LedgerRow[];
  onSettle: (row: LedgerRow) => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-start">العضو</TableHead>
            <TableHead className="text-start">المهام المكتملة</TableHead>
            <TableHead className="text-start">الرصيد المعلق</TableHead>
            <TableHead className="text-start">إجمالي المدفوع</TableHead>
            <TableHead className="text-start">إجراء</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8 border border-border">
                    <AvatarImage
                      src={row.avatar_url ?? undefined}
                      alt={row.full_name}
                    />
                    <AvatarFallback className="bg-bone text-xs font-semibold text-ink">
                      {initials(row.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium text-ink">
                      {row.full_name}
                    </p>
                    <Badge
                      variant="secondary"
                      className="mt-0.5 px-2 py-0 text-[10px]"
                    >
                      {ROLE_LABELS[row.role] ?? row.role}
                    </Badge>
                  </div>
                </div>
              </TableCell>
              <TableCell className="font-mono text-sm text-ink">
                {row.completedTasks}
              </TableCell>
              <TableCell className="font-mono text-sm text-ink">
                {formatMoney(row.pendingBalance)} د.أ
              </TableCell>
              <TableCell className="font-mono text-sm text-ink">
                {formatMoney(row.totalPaid)} د.أ
              </TableCell>
              <TableCell>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={row.pendingBalance <= 0}
                  onClick={() => onSettle(row)}
                >
                  <Banknote className="h-4 w-4" />
                  تسوية المبلغ
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
