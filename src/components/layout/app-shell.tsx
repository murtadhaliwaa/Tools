import { Suspense } from "react";
import type { Role } from "@/generated/prisma/client";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { NavProgress } from "@/components/layout/nav-progress";

export function AppShell({
  children,
  role,
  fullName,
}: {
  children: React.ReactNode;
  role: Role;
  fullName: string;
}) {
  return (
    <div className="flex h-svh overflow-hidden">
      <Suspense fallback={null}>
        <NavProgress />
      </Suspense>
      <AppSidebar role={role} fullName={fullName} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <MobileNav role={role} fullName={fullName} />
        <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
