import { redirect } from "next/navigation";
import { Toaster } from "@/components/ui/sonner";
import { AppShell } from "@/components/layout/app-shell";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { AuthError, ForbiddenError, requireUser } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let session;
  try {
    session = await requireUser();
  } catch (error) {
    // مسار Route Handler يمسح الكوكيز فعلياً ويكسر حلقة ERR_TOO_MANY_REDIRECTS
    if (error instanceof ForbiddenError) {
      redirect("/auth/signout?error=pending");
    }
    if (error instanceof AuthError) {
      redirect("/auth/signout");
    }
    redirect("/auth/signout");
  }

  return (
    <AppShell role={session.profile.role} fullName={session.profile.fullName}>
      {children}
      <Toaster richColors position="top-center" />
      <InstallPrompt />
    </AppShell>
  );
}
