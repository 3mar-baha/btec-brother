import { randomBytes } from "crypto";
import { redirect } from "next/navigation";

import { SettingsPanel } from "@/components/settings/settings-panel";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const metadata = {
  title: "إعدادات الحساب",
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: { linked?: string; conflict?: string; error?: string };
}) {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("telegram_chat_id, telegram_username")
    .eq("id", user.id)
    .single();

  const linked = profile?.telegram_chat_id != null;

  let botLink: string | null = null;
  if (!linked) {
    const token = randomBytes(16).toString("hex");
    const service = createServiceClient();

    await service.from("telegram_link_tokens").delete().eq("user_id", user.id);

    const { error } = await service.from("telegram_link_tokens").insert({
      token,
      user_id: user.id,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    });

    if (!error) {
      const username = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "";
      botLink = `https://t.me/${username}?start=${token}`;
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-2xl font-bold tracking-tight text-ink">
        إعدادات الحساب
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        اربط حسابك على Telegram لاستقبال الإشعارات عند تحديث المهام.
      </p>

      <div className="mt-6">
        <SettingsPanel
          linked={linked}
          telegramUsername={profile?.telegram_username ?? null}
          botLink={botLink}
          flash={{
            linked: searchParams.linked === "1",
            conflict: searchParams.conflict === "1",
            error: searchParams.error === "1",
          }}
        />
      </div>
    </div>
  );
}
