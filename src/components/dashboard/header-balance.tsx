"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Wallet } from "lucide-react";

import { formatMoney } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";

export function HeaderBalance({
  userId,
  initialBalance,
}: {
  userId: string;
  initialBalance: number;
}) {
  const [balance, setBalance] = useState(initialBalance);
  const pathname = usePathname();

  useEffect(() => {
    let mounted = true;
    const supabase = createClient();

    async function refresh() {
      const { data } = await supabase
        .from("payouts")
        .select("amount, status")
        .eq("user_id", userId);
      if (!mounted) return;
      const settled = (data ?? [])
        .filter((p) => p.status === "settled")
        .reduce((sum, p) => sum + Number(p.amount), 0);
      setBalance(settled);
    }

    void refresh();

    const channel = supabase
      .channel(`payouts-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "payouts",
          filter: `user_id=eq.${userId}`,
        },
        () => void refresh()
      )
      .subscribe();

    return () => {
      mounted = false;
      void supabase.removeChannel(channel);
    };
  }, [userId, pathname]);

  return (
    <div className="hidden items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 font-mono text-sm font-bold text-ink sm:flex dark:bg-surface-dark">
      <Wallet className="h-4 w-4 text-muted-foreground" />
      <span>{formatMoney(balance)} د.أ</span>
    </div>
  );
}
