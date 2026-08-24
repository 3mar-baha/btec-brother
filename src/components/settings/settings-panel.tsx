"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Send, Unlink } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export function SettingsPanel({
  linked,
  telegramUsername,
  botLink,
  flash,
}: {
  linked: boolean;
  telegramUsername: string | null;
  botLink: string | null;
  flash: { linked?: boolean; conflict?: boolean; error?: boolean };
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [unlinking, setUnlinking] = useState(false);

  useEffect(() => {
    if (flash.linked) {
      toast({
        title: "تم الربط",
        description: "تم ربط حسابك على Telegram بنجاح.",
      });
    } else if (flash.conflict) {
      toast({
        title: "تعذر الربط",
        description: "حساب Telegram هذا مرتبط بمستخدم آخر.",
        variant: "destructive",
      });
    } else if (flash.error) {
      toast({
        title: "تعذر الربط",
        description: "حدث خطأ أثناء ربط حساب Telegram.",
        variant: "destructive",
      });
    }

    if (flash.linked || flash.conflict || flash.error) {
      router.replace("/settings");
    }
  }, [flash.linked, flash.conflict, flash.error, toast, router]);

  async function handleUnlink() {
    setUnlinking(true);
    try {
      const res = await fetch("/api/auth/telegram/unlink", { method: "POST" });

      if (res.ok) {
        toast({
          title: "تم إلغاء الربط",
          description: "تم إلغاء ربط حساب Telegram.",
        });
        router.refresh();
      } else {
        throw new Error("unlink failed");
      }
    } catch {
      toast({
        title: "تعذر إلغاء الربط",
        description: "حدث خطأ، حاول مجدداً.",
        variant: "destructive",
      });
    } finally {
      setUnlinking(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>ربط Telegram</CardTitle>
        <CardDescription>
          استقبل إشعارات تحديث المهام عبر حسابك على Telegram.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {linked ? (
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm text-ink">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <span>الحساب مربوط</span>
              {telegramUsername ? (
                <span className="text-muted-foreground">
                  @{telegramUsername}
                </span>
              ) : null}
            </div>
            <Button
              variant="outline"
              onClick={handleUnlink}
              disabled={unlinking}
              className="w-full sm:w-auto"
            >
              {unlinking ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Unlink className="h-4 w-4" />
              )}
              إلغاء الربط
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              اضغط الزر أدناه، ثم اضغط <span className="font-medium">Start</span>{" "}
              في البوت لإتمام الربط.
            </p>
            {botLink ? (
              <Button asChild>
                <a href={botLink} target="_blank" rel="noopener noreferrer">
                  <Send className="h-4 w-4" />
                  ربط حساب Telegram
                </a>
              </Button>
            ) : (
              <p className="text-sm text-destructive">
                تعذر إنشاء رابط الربط حالياً. تأكد من تشغيل ملف الترحيل في
                Supabase ثم حدّث الصفحة.
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              بعد الضغط على Start في البوت، عد إلى هذه الصفحة وحدّثها لرؤية حالة
              الربط.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
