"use client";

import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/shared/spinner";
import { cn } from "@/lib/utils";

type LoadingButtonProps = ComponentProps<typeof Button> & {
  loading?: boolean;
  loadingText?: string;
};

/** زر مع مؤشر تحميل موحّد لعمليات CRUD */
export function LoadingButton({
  loading = false,
  loadingText,
  children,
  disabled,
  className,
  ...props
}: LoadingButtonProps) {
  return (
    <Button
      {...props}
      disabled={disabled || loading}
      className={cn(loading && "pointer-events-none", className)}
      aria-busy={loading || undefined}
    >
      {loading ? (
        <>
          <Spinner />
          <span>{loadingText ?? children}</span>
        </>
      ) : (
        children
      )}
    </Button>
  );
}
