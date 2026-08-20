"use client";

import { useState } from "react";
import { Loader2, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import { escapeHtml, notifyTelegramUser } from "@/lib/telegram";
import type { WorkspaceOrder } from "./types";

interface SubmitSolutionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: WorkspaceOrder;
  userName: string;
  onSubmitted: () => void;
}

export function SubmitSolutionModal({
  open,
  onOpenChange,
  order,
  userName,
  onSubmitted,
}: SubmitSolutionModalProps) {
  const { toast } = useToast();
  const [url, setUrl] = useState("");
  const [plagiarism, setPlagiarism] = useState("");
  const [ai, setAi] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const driveUrl = url.trim();
    if (!driveUrl) {
      toast({
        title: "الرابط مطلوب",
        description: "يرجى إدخال رابط الحل على Google Drive",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("submit_order_solution", {
      p_order_id: order.id,
      p_submission_url: driveUrl,
      p_plagiarism_rate: plagiarism.trim() ? Number(plagiarism) : null,
      p_ai_percentage: ai.trim() ? Number(ai) : null,
    });
    setSubmitting(false);

    if (error) {
      toast({
        title: "تعذر تسليم الحل",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "تم التسليم",
      description: data?.message ?? "تم تسليم الحل بنجاح",
    });
    notifyTelegramUser(
      order.broker_id,
      `📬 تم تسليم حل الطلب #${order.order_number} بواسطة ${escapeHtml(
        userName
      )} وجاري المراجعة`
    );
    setUrl("");
    setPlagiarism("");
    setAi("");
    onSubmitted();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>تسليم الحل</DialogTitle>
          <DialogDescription>
            أدخل رابط الحل ونسب الفحص (الاقتباس والذكاء الاصطناعي).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field label="رابط Google Drive">
            <Input
              dir="ltr"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://drive.google.com/..."
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="نسبة الاقتباس (Turnitin %)">
              <Input
                dir="ltr"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={plagiarism}
                onChange={(e) => setPlagiarism(e.target.value)}
              />
            </Field>
            <Field label="نسبة الذكاء الاصطناعي (AI %)">
              <Input
                dir="ltr"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={ai}
                onChange={(e) => setAi(e.target.value)}
              />
            </Field>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-ink text-background shadow-none hover:opacity-90"
            >
              {submitting ? (
                <Loader2 className="animate-spin" />
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  تسليم الحل
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
