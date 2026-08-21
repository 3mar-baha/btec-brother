"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  BarChart3,
  Bell,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatMoney } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";

export type Role = "admin" | "broker" | "worker";

export interface NavUser {
  fullName: string;
  email: string;
  avatarUrl: string | null;
  role: Role;
  balance: number;
  pendingCount: number;
}

const ROLE_LABELS: Record<Role, string> = {
  admin: "مدير",
  broker: "وسيط",
  worker: "عامل",
};

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/market", label: "سوق الطلبات", icon: ShoppingBag },
  { href: "/workspace", label: "لوحة العمل", icon: LayoutDashboard },
  { href: "/directory", label: "دليل الفريق", icon: Users },
  { href: "/logs", label: "السجلات والتحليلات", icon: BarChart3 },
];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "؟";
  if (parts.length === 1) return parts[0].slice(0, 2);
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function DashboardNav({ user }: { user: NavUser }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const items: NavItem[] =
    user.role === "admin"
      ? [...NAV_ITEMS, { href: "/admin", label: "الإدارة", icon: ShieldCheck }]
      : NAV_ITEMS;

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-canvas">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
        <Link href="/market" className="flex shrink-0 items-center">
          <Image
            src="/logo-light.png"
            alt="BTEC Hub"
            width={958}
            height={212}
            priority
            className="h-10 w-auto object-contain dark:hidden"
          />
          <Image
            src="/logo-dark.png"
            alt="BTEC Hub"
            width={958}
            height={212}
            priority
            className="hidden h-10 w-auto object-contain dark:block"
          />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {items.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition-colors",
                  active
                    ? "bg-ink text-background"
                    : "text-muted-foreground hover:bg-bone hover:text-ink"
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="ms-auto flex items-center gap-3">
          {user.role === "admin" && (
            <Link
              href="/admin?tab=members"
              aria-label="طلبات الانضمام"
              className="relative flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:text-ink"
            >
              <Bell className="h-4 w-4" />
              {user.pendingCount > 0 && (
                <span className="absolute -end-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 font-mono text-[10px] font-semibold leading-none text-white">
                  {user.pendingCount}
                </span>
              )}
            </Link>
          )}
          <div className="hidden items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 sm:flex">
            <Wallet className="h-4 w-4 text-muted-foreground" />
            <span className="font-mono text-sm font-medium text-ink">
              {formatMoney(user.balance)} د.أ
            </span>
          </div>

          <ThemeToggle />

          <Button
            asChild
            size="sm"
            className="hidden h-9 bg-brand px-4 text-white shadow-none hover:bg-brand-pressed sm:inline-flex"
          >
            <Link href="/market">
              <ShoppingBag className="h-4 w-4" />
              تصفح السوق
            </Link>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-full outline-none">
                <Avatar className="h-9 w-9 border border-border">
                  <AvatarImage
                    src={user.avatarUrl ?? undefined}
                    alt={user.fullName}
                  />
                  <AvatarFallback className="bg-bone text-xs font-semibold text-ink">
                    {initials(user.fullName)}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden text-start lg:block">
                  <span className="block text-sm font-medium leading-tight text-ink">
                    {user.fullName}
                  </span>
                  <Badge variant="secondary" className="mt-0.5 px-2 py-0 text-[10px]">
                    {ROLE_LABELS[user.role]}
                  </Badge>
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="flex flex-col">
                <span className="text-sm font-medium">{user.fullName}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {user.email}
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/market">سوق الطلبات</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings">
                  <Settings className="h-4 w-4" />
                  إعدادات الحساب
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleSignOut}
                className="text-destructive"
              >
                <LogOut className="h-4 w-4" />
                تسجيل الخروج
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="القائمة"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {open && (
        <nav className="flex flex-col gap-1 border-t border-border bg-canvas p-3 md:hidden">
          {items.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-full px-4 py-2.5 text-sm",
                  active
                    ? "bg-ink text-background"
                    : "text-muted-foreground hover:bg-bone"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
}
