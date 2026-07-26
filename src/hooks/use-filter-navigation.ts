"use client";

import { useRouter } from "next/navigation";
import { useCallback, useTransition } from "react";

/** بناء query والانتقال لصفحة فلترة — مشترك لكل تقارير/قوائم */
export function useFilterNavigation(pathname: string) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const navigate = useCallback(
    (params: Record<string, string | undefined | null>) => {
      const q = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        if (value) q.set(key, value);
      }
      const qs = q.toString();
      startTransition(() => {
        router.push(qs ? `${pathname}?${qs}` : pathname);
      });
    },
    [pathname, router],
  );

  return { pending, navigate };
}
