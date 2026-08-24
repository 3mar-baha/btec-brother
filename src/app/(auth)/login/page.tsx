"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { animate, createTimeline, spring, stagger } from "animejs";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TelegramLoginButton } from "@/components/telegram-login-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

function translateAuthError(message: string): string {
  if (message === "email_exists") {
    return "هذا البريد الإلكتروني مسجل مسبقاً";
  }
  if (message === "signup_failed" || message === "invalid_fields") {
    return "تعذر إنشاء الحساب، تحقق من البيانات وحاول مرة أخرى";
  }
  if (/invalid login credentials/i.test(message)) {
    return "البريد الإلكتروني أو كلمة المرور غير صحيحة";
  }
  if (/email not confirmed/i.test(message)) {
    return "لم يتم تأكيد البريد الإلكتروني بعد";
  }
  if (/already registered/i.test(message)) {
    return "هذا البريد الإلكتروني مسجل مسبقاً";
  }
  if (/password should be at least/i.test(message)) {
    return "كلمة المرور يجب أن تكون 6 أحرف على الأقل";
  }
  if (/valid email/i.test(message)) {
    return "يرجى إدخال بريد إلكتروني صحيح";
  }
  return message;
}

function resolveDestination(role: string, redirectedFrom: string | null): string {
  if (role === "admin") return "/admin";
  if (
    redirectedFrom &&
    redirectedFrom !== "/login" &&
    redirectedFrom !== "/admin"
  ) {
    return redirectedFrom;
  }
  return "/market";
}

type Mode = "signin" | "signup";

const EMPTY_SIGNUP = {
  full_name: "",
  email: "",
  password: "",
  phone_number: "",
  requested_role: "worker",
};

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showEmail, setShowEmail] = useState(false);

  const [signup, setSignup] = useState(EMPTY_SIGNUP);
  const [signupLoading, setSignupLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const logoRef = useRef<HTMLDivElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const authRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get("error");
    if (error === "linked") {
      setAuthError(
        "حساب Telegram هذا مربوط بالفعل بحساب بريد إلكتروني. يرجى تسجيل الدخول بالبريد الإلكتروني."
      );
    } else if (error === "telegram") {
      setAuthError("تعذر تسجيل الدخول عبر Telegram. حاول مرة أخرى.");
    }
  }, []);

  useIsomorphicLayoutEffect(() => {
    const logo = logoRef.current;
    const subtitle = subtitleRef.current;
    const auth = authRef.current;
    if (!logo || !subtitle || !auth) return;

    const tl = createTimeline({ defaults: { ease: "outBack" } });
    tl.add(logo, {
      opacity: [0, 1],
      scale: [0.7, 1],
      duration: 800,
      ease: spring({ stiffness: 180, damping: 12 }),
    })
      .add(subtitle, { opacity: [0, 1], translateY: [30, 0], duration: 600 }, "-=400")
      .add(auth, { opacity: [0, 1], translateY: [44, 0], scale: [0.95, 1], duration: 700 }, "-=350");

    return () => {
      tl.pause();
    };
  }, []);

  useEffect(() => {
    if (!showEmail) return;
    const form = formRef.current;
    if (!form) return;
    const fields = Array.from(form.children) as HTMLElement[];
    const animation = animate(fields, {
      opacity: [0, 1],
      translateY: [28, 0],
      scale: [0.96, 1],
      duration: 600,
      ease: "outBack",
      delay: stagger(70),
    });
    return () => {
      animation.pause();
    };
  }, [showEmail, mode]);

  function setSignupField<K extends keyof typeof EMPTY_SIGNUP>(
    field: K,
    value: string
  ) {
    setSignup((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSignIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!email || !password) {
      toast({
        title: "حقول ناقصة",
        description: "يرجى إدخال البريد الإلكتروني وكلمة المرور",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast({
        title: "تعذر تسجيل الدخول",
        description: translateAuthError(error.message),
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    const user = data.user;
    if (!user) {
      toast({
        title: "تعذر تسجيل الدخول",
        description: "لم يتم العثور على المستخدم",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = profile?.role ?? "worker";
    const redirectedFrom = new URLSearchParams(window.location.search).get(
      "redirectedFrom"
    );

    router.push(resolveDestination(role, redirectedFrom));
    router.refresh();
  }

  async function handleSignUp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const { full_name, email: signupEmail, password: signupPassword, phone_number } =
      signup;

    if (
      !full_name.trim() ||
      !signupEmail.trim() ||
      !signupPassword ||
      !phone_number.trim()
    ) {
      toast({
        title: "حقول ناقصة",
        description: "يرجى تعبئة جميع الحقول المطلوبة",
        variant: "destructive",
      });
      return;
    }

    setSignupLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: signupEmail.trim(),
          password: signupPassword,
          full_name: full_name.trim(),
          phone_number: phone_number.trim(),
          requested_role: signup.requested_role,
        }),
      });
      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.success) {
        toast({
          title: "تعذر إنشاء الحساب",
          description: translateAuthError(
            typeof json?.error === "string" ? json.error : "حدث خطأ غير متوقع"
          ),
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "تم إنشاء الحساب",
        description: "حسابك قيد المراجعة بانتظار موافقة المدير",
      });
      router.push(json.redirect ?? "/pending-approval");
      router.refresh();
    } catch {
      toast({
        title: "تعذر إنشاء الحساب",
        description: "تعذر الاتصال بالخادم، تحقق من اتصالك وحاول مجدداً.",
        variant: "destructive",
      });
    } finally {
      setSignupLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div ref={logoRef} className="flex flex-col items-center gap-3">
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
        <p ref={subtitleRef} className="text-center text-sm text-muted-foreground">
          منصة إدارة مهام BTEC الداخلية
        </p>
      </div>

      {authError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm leading-relaxed text-destructive">
          {authError}
        </div>
      )}

      <div ref={authRef} className="flex flex-col gap-3">
        <TelegramLoginButton />

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          أو
          <span className="h-px flex-1 bg-border" />
        </div>

        <Button
          type="button"
          variant="ghost"
          className="w-full text-muted-foreground hover:text-ink"
          onClick={() => setShowEmail((v) => !v)}
        >
          {showEmail
            ? "إخفاء تسجيل الدخول بالبريد"
            : "تسجيل الدخول بالبريد الإلكتروني"}
        </Button>
      </div>

      {showEmail && (
        <>
          <div className="flex rounded-full bg-bone p-1">
        <button
          type="button"
          onClick={() => setMode("signin")}
          className={cn(
            "flex-1 rounded-full px-4 py-2 text-sm font-medium transition-colors",
            mode === "signin"
              ? "bg-ink text-background"
              : "text-muted-foreground hover:text-ink"
          )}
        >
          تسجيل الدخول
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={cn(
            "flex-1 rounded-full px-4 py-2 text-sm font-medium transition-colors",
            mode === "signup"
              ? "bg-ink text-background"
              : "text-muted-foreground hover:text-ink"
          )}
        >
          إنشاء حساب جديد
        </button>
      </div>

      {mode === "signin" ? (
        <form ref={formRef} onSubmit={handleSignIn} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">البريد الإلكتروني</Label>
            <Input
              id="email"
              type="email"
              dir="ltr"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="password">كلمة المرور</Label>
            <Input
              id="password"
              type="password"
              dir="ltr"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          <Button type="submit" disabled={loading} className="mt-2 h-11 w-full">
            {loading ? <Loader2 className="animate-spin" /> : "تسجيل الدخول"}
          </Button>
        </form>
      ) : (
        <form ref={formRef} onSubmit={handleSignUp} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="signup-name">الاسم الثلاثي</Label>
            <Input
              id="signup-name"
              value={signup.full_name}
              onChange={(e) => setSignupField("full_name", e.target.value)}
              autoComplete="name"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="signup-email">البريد الإلكتروني</Label>
            <Input
              id="signup-email"
              type="email"
              dir="ltr"
              placeholder="you@example.com"
              value={signup.email}
              onChange={(e) => setSignupField("email", e.target.value)}
              autoComplete="email"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="signup-password">كلمة المرور</Label>
            <Input
              id="signup-password"
              type="password"
              dir="ltr"
              placeholder="••••••••"
              value={signup.password}
              onChange={(e) => setSignupField("password", e.target.value)}
              autoComplete="new-password"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="signup-phone">رقم الهاتف</Label>
            <Input
              id="signup-phone"
              type="tel"
              dir="ltr"
              placeholder="07XXXXXXXX"
              value={signup.phone_number}
              onChange={(e) => setSignupField("phone_number", e.target.value)}
              autoComplete="tel"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>الدور المطلوب</Label>
            <Select
              value={signup.requested_role}
              onValueChange={(v) => setSignupField("requested_role", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="worker">عامل</SelectItem>
                <SelectItem value="broker">وسيط</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            type="submit"
            disabled={signupLoading}
            className="mt-2 h-11 w-full"
          >
            {signupLoading ? (
              <Loader2 className="animate-spin" />
            ) : (
              "إنشاء الحساب"
            )}
          </Button>
        </form>
      )}
        </>
      )}
    </div>
  );
}
