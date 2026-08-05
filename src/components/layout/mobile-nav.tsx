"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { useState } from "react";
import type { Role } from "@/generated/prisma/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { logoutAction } from "@/actions";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { BrandMark } from "@/components/shared/brand-mark";
import { NAV_ITEMS, isNavActive } from "@/components/layout/nav-items";

export function MobileNav({
  role,
  fullName,
}: {
  role: Role;
  fullName: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const items = NAV_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(role),
  );

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur md:hidden">
      <div className="flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              className={cn(
                "inline-flex size-10 items-center justify-center rounded-lg border",
              )}
              aria-label="فتح القائمة"
            >
              <Menu className="size-4" />
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle>القائمة</SheetTitle>
              </SheetHeader>
              <nav className="mt-4 space-y-1">
                {items.map((item) => {
                  const Icon = item.icon;
                  const active = isNavActive(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      prefetch={item.prefetch !== false}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center gap-2 rounded-lg px-3 py-3 text-sm",
                        active
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted",
                      )}
                    >
                      <Icon className="size-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
              <div className="mt-6 space-y-2 border-t pt-4">
                <p className="text-sm font-medium">{fullName}</p>
                <p className="text-xs text-muted-foreground">
                  {role === "ADMIN" ? "مدير" : "أمين عدة"}
                </p>
                <ThemeToggle showLabel />
                <form action={logoutAction}>
                  <Button type="submit" variant="outline" className="w-full">
                    تسجيل الخروج
                  </Button>
                </form>
              </div>
            </SheetContent>
          </Sheet>
          <ThemeToggle />
        </div>
        <div className="flex items-center gap-2">
          <BrandMark size={28} />
          <span className="font-semibold">تتبع الأدوات</span>
        </div>
      </div>
    </header>
  );
}
