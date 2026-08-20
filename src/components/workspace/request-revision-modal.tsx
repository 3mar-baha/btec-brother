"use client";

import { useState } from "react";
import { Loader2, MessageSquare } from "lucide-react";

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
import { escapeHtml, notifyTelegram } from "@/lib/telegram";
import type { WorkspaceOrder } from "./types";

interface RequestRevisionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: WorkspaceOrder;
  onRequested: () => void;
}

export function RequestRevisionModal({
  open,
  onOpenChange,
  order,
  onRequested,
}: RequestRevisionModalProps) {
  const { toast } = useToast();
  const [notes, setNotes] = useState("");
  const [requesting, setRequesting] = useState(false);

  async function handleRequest() {
    const trimmed = notes.trim();
    if (!trimmed) {
      toast({
        title: "الملاحظات مطلوبة",
        description: "يرجى كتابة ملاحظات التعديل للعامل",
        variant: "destructive",
      });
      return;
    }

    setRequesting(true);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("request_revision", {
      p_order_id: order.id,
      p_revision_notes: trimmed,
    });
    setRequesting(false);

    if (error) {
      toast({
        title: "تعذر طلب التعديل",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "تم طلب التعديل",
      description: data?.message ?? "تم إرسال الملاحظات إلى العامل",
    });
    notifyTelegram(
      `⚠️ طلب تعديل على الطلب #${order.order_number}: ${escapeHtml(trimmed)}`
    );
    setNotes("");
    onRequested();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>طلب تعديل</DialogTitle>
          <DialogDescription>
            ستُعاد المهمة إلى العامل مع ملاحظاتك لتعديل الحل.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <Label htmlFor="revision-notes">ملاحظات التعديل</Label>
          <Textarea
            id="revision-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="اذكر التعديلات المطلوبة بالتفصيل..."
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button
            disabled={requesting}
            className="bg-ink text-background shadow-none hover:opacity-90"
            onClick={handleRequest}
          >
            {requesting ? (
              <Loader2 className="animate-spin" />
            ) : (
              <>
                <MessageSquare className="h-4 w-4" />
                إرسال طلب التعديل
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
