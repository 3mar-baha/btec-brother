"use client";

import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";

import { Button } from "@/components/ui/button";

const BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "";
const BOT_ID = process.env.NEXT_PUBLIC_TELEGRAM_BOT_ID ?? "";

/**
 * Telegram Login Widget + a custom-styled fallback button. The official widget
 * (loaded dynamically) renders its own button and redirects to
 * `/api/auth/telegram` after auth; if the script is blocked, the fallback
 * button drives the same OAuth flow via oauth.telegram.org directly.
 */
export function TelegramLoginButton() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [widgetError, setWidgetError] = useState(false);

  useEffect(() => {
    if (!BOT_USERNAME) {
      setWidgetError(true);
      return;
    }

    const container = containerRef.current;
    if (!container) {
      setWidgetError(true);
      return;
    }

    const script = document.createElement("script");
    script.async = true;
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.setAttribute("data-telegram-login", BOT_USERNAME);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-userpic", "false");
    script.setAttribute("data-radius", "8");
    script.setAttribute("data-auth-url", "/api/auth/telegram");
    script.setAttribute("data-request-access", "write");
    script.onerror = () => setWidgetError(true);

    container.appendChild(script);
  }, []);

  function manualLogin() {
    const origin = window.location.origin;
    const returnTo = `${origin}/api/auth/telegram`;
    const url =
      `https://oauth.telegram.org/auth?bot_id=${encodeURIComponent(BOT_ID)}` +
      `&origin=${encodeURIComponent(origin)}` +
      `&request_access=write` +
      `&return_to=${encodeURIComponent(returnTo)}`;
    window.location.href = url;
  }

  return (
    <div className="flex flex-col items-stretch gap-3">
      <div ref={containerRef} className="flex justify-center" />
      {widgetError && (
        <Button
          type="button"
          variant="outline"
          onClick={manualLogin}
          className="w-full gap-2 border-[#54A9EB]/40 text-[#2481cc] hover:bg-[#54A9EB]/10"
        >
          <Send className="h-4 w-4" />
          تسجيل الدخول عبر Telegram
        </Button>
      )}
    </div>
  );
}
