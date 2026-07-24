"use client";

import { useActionState } from "react";
import Link from "next/link";
import { resetPasswordAction, type ActionResult } from "@/actions";
import { LoadingButton } from "@/components/shared/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const initial: ActionResult | null = null;

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState(resetPasswordAction, initial);

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl">كلمة مرور جديدة</CardTitle>
        <CardDescription>
          8 أحرف على الأقل وتحتوي حرفاً ورقماً
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">كلمة المرور الجديدة</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              dir="ltr"
            />
          </div>
          {state?.message ? (
            <p className="text-sm text-destructive">{state.message}</p>
          ) : null}
          <LoadingButton
            type="submit"
            className="w-full"
            loading={pending}
            loadingText="جاري الحفظ..."
          >
            حفظ كلمة المرور
          </LoadingButton>
          <p className="text-center text-sm text-muted-foreground">
            <Link href="/login" className="underline">
              تسجيل الدخول
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
