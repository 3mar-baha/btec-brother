"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Bell,
  BookUser,
  LayoutDashboard,
  LogOut,
  Settings,
  ShieldCheck,
  ShoppingBag,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { HeaderBalance } from "@/components/dashboard/header-balance";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";

export type Role = "admin" | "broker" | "worker";

export interface NavUser {
  id: string;
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

  // Clients CRM is staff-only (admin + broker).
  const base: NavItem[] =
    user.role === "worker"
      ? NAV_ITEMS
      : [
          ...NAV_ITEMS.slice(0, 2),
          { href: "/clients", label: "العملاء", icon: BookUser },
          ...NAV_ITEMS.slice(2),
        ];

  const items: NavItem[] =
    user.role === "admin"
      ? [...base, { href: "/admin", label: "لوحة الإدارة", icon: ShieldCheck }]
      : base;

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-card/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/market" className="flex shrink-0 items-center">
          <Image
            src="/logo-light.png"
            alt="BTEC Brother"
            width={1168}
            height={446}
            priority
            className="h-9 w-auto object-contain dark:hidden"
          />
          <Image
            src="/logo-dark.png"
            alt="BTEC Brother"
            width={1168}
            height={446}
            priority
            className="hidden h-9 w-auto object-contain dark:block"
          />
        </Link>

        {/* Center navigation */}
        <nav className="hidden items-center gap-1.5 rounded-full border border-border bg-bone/70 p-1.5 shadow-inner sm:flex dark:bg-card/90">
          {items.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all",
                  active
                    ? "bg-ink font-semibold text-white shadow-sm dark:bg-primary dark:text-white"
                    : "text-body hover:bg-bone/80 hover:text-ink dark:hover:bg-surface-dark"
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User controls */}
        <div className="flex items-center gap-3">
          <HeaderBalance userId={user.id} initialBalance={user.balance} />

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

          <ThemeToggle />

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
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel className="flex flex-col gap-1">
                <span className="text-sm font-medium">{user.fullName}</span>
                <span
                  className="text-xs font-normal text-muted-foreground"
                  dir="ltr"
                >
                  {user.email}
                </span>
                <Badge
                  variant="secondary"
                  className="w-fit px-2 py-0 text-[10px]"
                >
                  {ROLE_LABELS[user.role]}
                </Badge>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile">
                  <User className="h-4 w-4" />
                  الملف الشخصي
                </Link>
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
        </div>
      </div>
    </header>
  );
}
