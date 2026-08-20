"use client";

import { useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";

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
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import { notifyTelegram } from "@/lib/telegram";
import type { WorkspaceOrder } from "./types";

interface DropTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: WorkspaceOrder;
  onDropped: () => void;
}

export function DropTaskModal({
  open,
  onOpenChange,
  order,
  onDropped,
}: DropTaskModalProps) {
  const { toast } = useToast();
  const [reason, setReason] = useState("");
  const [dropping, setDropping] = useState(false);

  async function handleDrop() {
    setDropping(true);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("drop_order", {
      p_order_id: order.id,
      p_reason: reason.trim() || undefined,
    });
    setDropping(false);

    if (error) {
      toast({
        title: "تعذر التنازل عن المهمة",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "تم التنازل عن المهمة",
      description: data?.message ?? "عادت المهمة إلى السوق المفتوح",
    });
    notifyTelegram(
      `🔄 تم التنازل عن الطلب #${order.order_number} وأُعيد طرحه في السوق المفتوح`
    );
    setReason("");
    onDropped();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>الاعتذار والتنازل عن المهمة</DialogTitle>
          <DialogDescription>
            سيتم إرجاع المهمة إلى السوق المفتوح ولن تكون مكلفاً بها بعد الآن.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <Label htmlFor="drop-reason">سبب التنازل (اختياري)</Label>
          <Textarea
            id="drop-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="اذكر سبب الاعتذار..."
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button
            variant="destructive"
            disabled={dropping}
            onClick={handleDrop}
          >
            {dropping ? (
              <Loader2 className="animate-spin" />
            ) : (
              <>
                <AlertTriangle className="h-4 w-4" />
                تأكيد التنازل
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
