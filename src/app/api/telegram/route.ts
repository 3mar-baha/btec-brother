import { NextResponse } from "next/server";

import { sendTelegramNotification } from "@/lib/telegram";

export async function POST(request: Request) {
  let message = "";

  try {
    const body = (await request.json()) as { message?: unknown };
    if (typeof body.message === "string") {
      message = body.message.trim();
    }
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (!message) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const ok = await sendTelegramNotification(message);
  return NextResponse.json({ ok });
}
