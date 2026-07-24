import type { Role } from "@/generated/prisma/client";
import {
  ClipboardList,
  LayoutDashboard,
  Package,
  Tags,
  Cog,
  FileBarChart,
  Users,
  PlusCircle,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  roles?: Role[];
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "لوحة التحكم", icon: LayoutDashboard },
  { href: "/transactions/new", label: "تسجيل حركة", icon: PlusCircle },
  { href: "/transactions", label: "سجل الحركات", icon: ClipboardList },
  { href: "/items", label: "الأدوات", icon: Package },
  { href: "/machines", label: "المكائن", icon: Cog },
  { href: "/categories", label: "التصنيفات", icon: Tags, roles: ["ADMIN"] },
  { href: "/reports", label: "التقارير", icon: FileBarChart },
  { href: "/users", label: "الحسابات", icon: Users, roles: ["ADMIN"] },
  { href: "/settings", label: "الإعدادات", icon: Settings, roles: ["ADMIN"] },
];

/** يختار أطول رابط مطابق حتى لا يُفعَّل /transactions مع /transactions/new */
export function isNavActive(pathname: string, href: string) {
  const matches = (itemHref: string) =>
    pathname === itemHref ||
    (itemHref !== "/" && pathname.startsWith(`${itemHref}/`));

  if (!matches(href)) return false;

  const longerMatch = NAV_ITEMS.some(
    (item) =>
      item.href !== href &&
      item.href.length > href.length &&
      matches(item.href),
  );

  return !longerMatch;
}
