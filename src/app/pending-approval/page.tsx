import Image from "next/image";
import { Clock } from "lucide-react";
import { redirect } from "next/navigation";

import { SignOutButton } from "@/components/pending-approval/sign-out-button";
import { getCurrentProfile, getCurrentUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PendingApprovalPage() {
  const user = await getCurrentUser();

  if (!user) redirect("/login");

  const profile = await getCurrentProfile(user.id);

  if (profile?.is_approved === true) {
    redirect(profile.role === "admin" ? "/admin" : "/market");
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

        <SignOutButton />
      </div>
    </div>
  );
}
