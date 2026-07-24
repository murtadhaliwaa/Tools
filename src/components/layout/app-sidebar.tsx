"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@/generated/prisma/client";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/actions";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { BrandMark } from "@/components/shared/brand-mark";
import { NAV_ITEMS, isNavActive } from "@/components/layout/nav-items";

export function AppSidebar({
  role,
  fullName,
}: {
  role: Role;
  fullName: string;
}) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(role),
  );

  return (
    <aside className="hidden h-svh w-56 shrink-0 flex-col overflow-hidden border-l bg-card md:flex lg:w-60">
      <div className="flex shrink-0 items-center gap-2 px-3 py-3">
        <BrandMark size={32} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-tight">
            تتبع الأدوات
          </p>
          <p className="truncate text-[11px] text-muted-foreground">
            نظام عدة الورشة
          </p>
        </div>
      </div>
      <Separator className="shrink-0" />
      <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto p-2">
        {items.map((item) => {
          const active = isNavActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              className={cn(
                "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="size-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="shrink-0 space-y-2 border-t p-2.5">
        <div className="flex items-center justify-between gap-2 px-0.5">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium leading-tight">
              {fullName}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {role === "ADMIN" ? "مدير" : "أمين عدة"}
            </p>
          </div>
          <ThemeToggle />
        </div>
        <form action={logoutAction}>
          <Button type="submit" variant="outline" size="sm" className="w-full">
            تسجيل الخروج
          </Button>
        </form>
      </div>
    </aside>
  );
}
