import { LoginForm } from "@/components/auth/login-form";
import { ThemeToggle } from "@/components/theme/theme-toggle";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const error = Array.isArray(sp.error) ? sp.error[0] : sp.error;
  const pending = error === "pending";

  return (
    <main className="relative flex min-h-full flex-1 items-center justify-center bg-muted/30 p-4">
      <div className="absolute start-4 top-4">
        <ThemeToggle />
      </div>
      <div className="flex w-full max-w-md flex-col gap-3">
        {pending ? (
          <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
            الحساب بانتظار موافقة المدير. بعد التفعيل سجّل الدخول من هنا.
          </p>
        ) : null}
        <LoginForm />
      </div>
    </main>
  );
}
