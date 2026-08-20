import { NextResponse } from "next/server";

import {
  sendGroupNotification,
  sendPrivateNotification,
} from "@/lib/telegram";

export async function POST(request: Request) {
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

  const ok = userId
    ? await sendPrivateNotification(userId, message)
    : await sendGroupNotification(message);

  return NextResponse.json({ ok });
}
