"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  LayoutDashboard,
  ShieldCheck,
  ShoppingBag,
  Users,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/market", label: "سوق الطلبات", icon: ShoppingBag },
  { href: "/workspace", label: "لوحة العمل", icon: LayoutDashboard },
  { href: "/directory", label: "دليل الفريق", icon: Users },
  { href: "/logs", label: "السجلات", icon: BarChart3 },
];

export function BottomNav({ role }: { role: string }) {
  const pathname = usePathname();

  const items: NavItem[] =
    role === "admin"
      ? [...NAV_ITEMS, { href: "/admin", label: "الإدارة", icon: ShieldCheck }]
      : NAV_ITEMS;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-border bg-card/95 px-3 py-2 shadow-lg backdrop-blur-lg sm:hidden">
      {items.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium transition-colors",
              active ? "text-brand" : "text-muted-foreground"
            )}
          >
            <Icon className="h-5 w-5" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
