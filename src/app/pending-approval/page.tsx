"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Clock, Loader2, LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export default function PendingApprovalPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-canvas px-4 py-10">
      <Image
        src="/logo-light.png"
        alt="BTEC Hub"
        width={958}
        height={212}
        priority
        className="h-16 w-auto object-contain dark:hidden"
      />
      <Image
        src="/logo-dark.png"
        alt="BTEC Hub"
        width={958}
        height={212}
        priority
        className="hidden h-16 w-auto object-contain dark:block"
      />
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-bone">
          <Clock className="h-7 w-7 text-ink" />
        </div>
        <h1 className="mt-5 font-display text-2xl font-bold tracking-tight text-ink">
          الحساب قيد المراجعة
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          تم إنشاء حسابك بنجاح. سيراجع المدير طلب الانضمام وسيتم تفعيل حسابك
          قريباً.
        </p>

        <Button
          onClick={handleSignOut}
          disabled={loading}
          variant="outline"
          className="mt-6 w-full"
        >
          {loading ? (
            <Loader2 className="animate-spin" />
          ) : (
            <>
              <LogOut className="h-4 w-4" />
              تسجيل الخروج
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
