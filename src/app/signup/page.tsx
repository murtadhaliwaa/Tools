import { SignupForm } from "@/components/auth/signup-form";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { isBootstrapPending } from "@/lib/bootstrap";
import { prisma } from "@/lib/db";

export default async function SignupPage() {
  const profileCount = await prisma.profile.count();
  const needsBootstrap = isBootstrapPending(profileCount);

  return (
    <main className="relative flex min-h-full flex-1 items-center justify-center bg-muted/30 p-4">
      <div className="absolute start-4 top-4">
        <ThemeToggle />
      </div>
      <SignupForm needsBootstrap={needsBootstrap} />
    </main>
  );
}
