import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export default function ResetPasswordPage() {
  return (
    <main className="relative flex min-h-full flex-1 items-center justify-center bg-muted/30 p-4">
      <div className="absolute start-4 top-4">
        <ThemeToggle />
      </div>
      <ResetPasswordForm />
    </main>
  );
}
