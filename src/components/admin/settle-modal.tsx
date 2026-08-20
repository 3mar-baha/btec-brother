"use client";

import { useState } from "react";
import { Banknote, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatMoney } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import { escapeHtml, notifyTelegram } from "@/lib/telegram";
import { useToast } from "@/hooks/use-toast";
import type { LedgerRow } from "./types";

interface SettleModalProps {
  member: LedgerRow;
  onOpenChange: (open: boolean) => void;
  onSettled: () => void;
}

export function SettleModal({
  member,
  onOpenChange,
  onSettled,
}: SettleModalProps) {
  const { toast } = useToast();
  const [note, setNote] = useState("");
  const [settling, setSettling] = useState(false);

  async function handleSettle() {
    setSettling(true);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("settle_payout", {
      p_user_id: member.id,
      p_note: note.trim() || null,
    });
    setSettling(false);

    if (error) {
      toast({
        title: "تعذرت التسوية",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "تمت التسوية",
      description: data?.message ?? "تم تسوية المستحقات المالية",
    });
    notifyTelegram(
      `💳 قام المدير بتسوية وتحويل مستحقات ${escapeHtml(
        member.full_name
      )}: ${formatMoney(data?.settled_amount ?? member.pendingBalance)} د.أ`
    );
    setNote("");
    onSettled();
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>تسوية المبلغ</DialogTitle>
          <DialogDescription>
            تأكيد تحويل المستحقات المعلقة لـ {member.full_name}.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg bg-bone p-4">
          <p className="text-xs text-ash">المبلغ المعلق للتحويل</p>
          <p className="mt-1 font-mono text-xl font-semibold text-ink">
            {formatMoney(member.pendingBalance)} د.أ
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="settle-note">مرجع / ملاحظة الدفع</Label>
          <Textarea
            id="settle-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="رقم الحوالة أو ملاحظة التسوية..."
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button
            disabled={settling || member.pendingBalance <= 0}
            className="bg-ink text-background shadow-none hover:opacity-90"
            onClick={handleSettle}
          >
            {settling ? (
              <Loader2 className="animate-spin" />
            ) : (
              <>
                <Banknote className="h-4 w-4" />
                تأكيد التسوية
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
