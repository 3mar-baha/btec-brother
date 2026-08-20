"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { downloadTextFile, toCsv } from "@/lib/export";
import { createClient } from "@/lib/supabase/client";
import { CategoriesManager } from "./categories-manager";
import { EmergencyControl } from "./emergency-control";
import { FinancialCards } from "./financial-cards";
import { MemberLedger } from "./member-ledger";
import { SettleModal } from "./settle-modal";
import { UserManagement } from "./user-management";
import type {
  Category,
  FinancialSummary,
  LedgerRow,
  ManagedUser,
  StuckOrder,
  TransactionRow,
} from "./types";

const ROLE_LABELS: Record<string, string> = {
  admin: "مدير",
  broker: "وسيط",
  worker: "عامل",
};

interface AdminDashboardProps {
  summary: FinancialSummary;
  ledger: LedgerRow[];
  transactions: TransactionRow[];
  users: ManagedUser[];
  specialisations: Category[];
  gradeLevels: Category[];
  criteriaLevels: Category[];
  stuckOrders: StuckOrder[];
  initialTab: string;
}

export function AdminDashboard({
  summary,
  ledger,
  transactions,
  users,
  specialisations,
  gradeLevels,
  criteriaLevels,
  stuckOrders,
  initialTab,
}: AdminDashboardProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [settleTarget, setSettleTarget] = useState<LedgerRow | null>(null);
  const [reassigningId, setReassigningId] = useState<string | null>(null);

  async function handleReassign(orderId: string) {
    setReassigningId(orderId);
    const { data, error } = await supabase.rpc("drop_order", {
      p_order_id: orderId,
      p_reason: "سحب وإعادة طرح من قبل الإدارة",
    });
    setReassigningId(null);

    if (error) {
      toast({
        title: "تعذر سحب المهمة",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "تم سحب المهمة",
      description: data?.message ?? "تمت إعادة المهمة إلى السوق المفتوح",
    });
    router.refresh();
  }

  function handleExport() {
    const rows: (string | number | null)[][] = [];
    rows.push(["كشف الحسابات المالية — BTEC Hub"]);
    rows.push(["تاريخ التصدير", new Date().toLocaleString("ar-EG")]);
    rows.push([]);
    rows.push(["أرصدة الأعضاء"]);
    rows.push([
      "العضو",
      "الدور",
      "المهام المكتملة",
      "الرصيد المعلق",
      "إجمالي المدفوع",
    ]);
    ledger.forEach((r) => {
      rows.push([
        r.full_name,
        ROLE_LABELS[r.role] ?? r.role,
        r.completedTasks,
        r.pendingBalance,
        r.totalPaid,
      ]);
    });
    rows.push([]);
    rows.push(["سجل المعاملات"]);
    rows.push([
      "العضو",
      "الدور",
      "رقم الطلب",
      "نوع الحصة",
      "المبلغ",
      "الحالة",
      "التاريخ",
    ]);
    transactions.forEach((t) => {
      rows.push([
        t.member_name,
        ROLE_LABELS[t.role] ?? t.role,
        t.order_number ?? "",
        t.share_type === "worker" ? "عامل (80%)" : "وسيط (20%)",
        t.amount,
        t.status === "settled" ? "مسدّد" : "معلّق",
        t.created_at,
      ]);
    });

    const stamp = new Date().toISOString().slice(0, 10);
    downloadTextFile(`btec-financial-report-${stamp}.csv`, toCsv(rows));
  }

  return (
    <Tabs defaultValue={initialTab}>
      <TabsList className="mb-6 h-auto flex-wrap rounded-full bg-bone p-1">
        <TabsTrigger
          value="finance"
          className="rounded-full px-4 py-1.5 data-[state=active]:bg-ink data-[state=active]:text-background"
        >
          المالية
        </TabsTrigger>
        <TabsTrigger
          value="members"
          className="rounded-full px-4 py-1.5 data-[state=active]:bg-ink data-[state=active]:text-background"
        >
          المستخدمون
        </TabsTrigger>
        <TabsTrigger
          value="categories"
          className="rounded-full px-4 py-1.5 data-[state=active]:bg-ink data-[state=active]:text-background"
        >
          التصنيفات
        </TabsTrigger>
        <TabsTrigger
          value="control"
          className="rounded-full px-4 py-1.5 data-[state=active]:bg-ink data-[state=active]:text-background"
        >
          التحكم في المهام
        </TabsTrigger>
      </TabsList>

      <TabsContent value="finance" className="space-y-6">
        <FinancialCards summary={summary} />
        <div className="flex justify-start">
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4" />
            تصدير كشف الحسابات
          </Button>
        </div>
        <MemberLedger rows={ledger} onSettle={setSettleTarget} />
      </TabsContent>

      <TabsContent value="members">
        <UserManagement users={users} />
      </TabsContent>

      <TabsContent value="categories">
        <CategoriesManager
          specialisations={specialisations}
          gradeLevels={gradeLevels}
          criteriaLevels={criteriaLevels}
        />
      </TabsContent>

      <TabsContent value="control">
        <EmergencyControl
          orders={stuckOrders}
          reassigningId={reassigningId}
          onReassign={handleReassign}
        />
      </TabsContent>

      {settleTarget && (
        <SettleModal
          member={settleTarget}
          onOpenChange={(open) => {
            if (!open) setSettleTarget(null);
          }}
          onSettled={() => {
            setSettleTarget(null);
            router.refresh();
          }}
        />
      )}
    </Tabs>
  );
}
