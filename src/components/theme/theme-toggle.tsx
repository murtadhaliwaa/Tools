"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function subscribe() {
  return () => {};
}

export function ThemeToggle({
  className,
  showLabel = false,
}: {
  className?: string;
  showLabel?: boolean;
}) {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);

  if (!mounted) {
    return (
      <Button
        type="button"
        variant="outline"
        size={showLabel ? "default" : "icon"}
        className={cn(showLabel && "w-full justify-start gap-2", className)}
        disabled
        aria-label="تبديل الوضع"
      >
        <Sun className="size-4" />
        {showLabel ? "الوضع" : null}
      </Button>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      type="button"
      variant="outline"
      size={showLabel ? "default" : "icon"}
      className={cn(showLabel && "w-full justify-start gap-2", className)}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "تفعيل الوضع النهاري" : "تفعيل الوضع الليلي"}
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
      {showLabel ? (isDark ? "وضع نهاري" : "وضع ليلي") : null}
    </Button>
  );
}
