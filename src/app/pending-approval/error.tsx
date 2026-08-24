"use client";

import { Button } from "@/components/ui/button";

export default function DashboardError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="font-display text-xl font-bold text-ink">
        تعذر تحميل الصفحة
      </h1>
      <p className="max-w-md text-sm text-muted-foreground">
        حدث خطأ أثناء جلب بيانات حسابك من الخادم. حاول إعادة المحاولة، وإن
        استمرت المشكلة فسجّل الدخول من جديد.
      </p>
      <div className="flex gap-2">
        <Button onClick={reset}>إعادة المحاولة</Button>
        <Button variant="outline" onClick={() => (window.location.href = "/login")}>
          تسجيل الدخول
        </Button>
      </div>
    </div>
  );
}
