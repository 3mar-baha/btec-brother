import { NextResponse } from "next/server";

import { createServiceClient } from "@/lib/supabase/service";
import { getCurrentUser } from "@/lib/supabase/server";
import {
  sendGroupNotification,
  sendPrivateNotification,
} from "@/lib/telegram";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_MESSAGE_LENGTH = 4000;

// Authenticated members may post to the team group. Private DMs additionally
// require being an admin or sharing an order with the target (broker<->worker),
// so an authenticated session alone cannot spam arbitrary members.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let message = "";
  let userId: string | null = null;

  try {
    const body = (await request.json()) as {
      message?: unknown;
      userId?: unknown;
    };
    if (typeof body.message === "string") {
      message = body.message.trim();
    }
    if (typeof body.userId === "string" && body.userId) {
      userId = body.userId;
    }
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (!message) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  // Validate before touching the PostgREST filter DSL — userId is client input.
  if (userId && !UUID_RE.test(userId)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (userId) {
    const service = createServiceClient();
    const { data: caller } = await service
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (caller?.role !== "admin") {
      const { count } = await service
        .from("orders")
        .select("id", { count: "exact", head: true })
        .or(
          `and(broker_id.eq.${user.id},worker_id.eq.${userId}),and(worker_id.eq.${user.id},broker_id.eq.${userId})`
        );
      if ((count ?? 0) === 0) {
        return NextResponse.json({ ok: false }, { status: 403 });
      }
    }
  }

  const text = message.slice(0, MAX_MESSAGE_LENGTH);
  const ok = userId
    ? await sendPrivateNotification(userId, text)
    : await sendGroupNotification(text);

  return NextResponse.json({ ok });
}
