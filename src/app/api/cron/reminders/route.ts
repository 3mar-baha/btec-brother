import { NextResponse } from "next/server";

import { createServiceClient } from "@/lib/supabase/service";
import { escapeHtml, sendPrivateNotification } from "@/lib/telegram";

export const dynamic = "force-dynamic";

/**
 * Telegram deadline reminders — invoked hourly by Vercel Cron.
 * Authorization: Vercel sends `Authorization: Bearer <CRON_SECRET>` when the
 * env var is configured; requests without it are rejected.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const provided = request.headers.get("authorization");
  if (!secret || provided !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const now = Date.now();

  const { data: orders, error } = await supabase
    .from("orders")
    .select(
      "id, order_number, title, unit_title, deadline, worker_id, broker_id, reminder_sent_24h, reminder_sent_6h"
    )
    .eq("status", "in_progress")
    .gt("deadline", new Date(now).toISOString())
    .lt("deadline", new Date(now + 24 * 3_600_000).toISOString());

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  const link = appUrl ? `\n🔗 <a href="${appUrl}/workspace">افتح لوحة العمل</a>` : "";

  let sent24 = 0;
  let sent6 = 0;

  for (const o of orders ?? []) {
    const hoursLeft = (new Date(o.deadline).getTime() - now) / 3_600_000;
    const base =
      `⏰ <b>تذكير بموعد نهائي يقترب</b>\n` +
      `📋 الطلب #${o.order_number}: ${escapeHtml(o.title)}\n` +
      `📚 الوحدة: ${escapeHtml(o.unit_title)}\n` +
      `🕐 المتبقي: أقل من ${hoursLeft < 6 ? 6 : 24} ساعة` +
      link;

    // Urgent window first; an order inside it skips the 24h notice entirely.
    if (hoursLeft <= 6 && !o.reminder_sent_6h) {
      const targets = [o.worker_id, o.broker_id].filter(Boolean) as string[];
      const results = await Promise.all(
        targets.map((id) => sendPrivateNotification(id, `🚨 ${base}`))
      );
      if (results.some(Boolean)) {
        const stamp = new Date().toISOString();
        const patch: { reminder_sent_6h: string; reminder_sent_24h?: string } = {
          reminder_sent_6h: stamp,
        };
        if (!o.reminder_sent_24h) patch.reminder_sent_24h = stamp;
        await supabase.from("orders").update(patch).eq("id", o.id);
        sent6 += results.filter(Boolean).length;
      }
      continue;
    }

    if (hoursLeft > 6 && !o.reminder_sent_24h) {
      const targets = [o.worker_id, o.broker_id].filter(Boolean) as string[];
      const results = await Promise.all(
        targets.map((id) => sendPrivateNotification(id, base))
      );
      if (results.some(Boolean)) {
        await supabase
          .from("orders")
          .update({ reminder_sent_24h: new Date().toISOString() })
          .eq("id", o.id);
        sent24 += results.filter(Boolean).length;
      }
    }
  }

  return NextResponse.json({ ok: true, sent24, sent6 });
}
