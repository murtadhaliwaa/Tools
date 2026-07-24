"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction, type ActionResult } from "@/actions";
import { LoadingButton } from "@/components/shared/loading-button";
import { BrandMark } from "@/components/shared/brand-mark";
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

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, initial);

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <div className="mb-1 flex items-center gap-2">
          <BrandMark size={36} />
          <CardTitle className="text-2xl">تسجيل الدخول</CardTitle>
        </div>
        <CardDescription>نظام تتبع أدوات وعدة الورشة</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">البريد الإلكتروني</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              dir="ltr"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="password">كلمة المرور</Label>
              <Link
                href="/forgot-password"
                className="text-xs text-muted-foreground underline"
              >
                نسيت كلمة المرور؟
              </Link>
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="current-password"
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
            loadingText="جاري الدخول..."
          >
            دخول
          </LoadingButton>
          <p className="text-center text-sm text-muted-foreground">
            ليس لديك حساب؟{" "}
            <Link href="/signup" className="text-foreground underline">
              إنشاء حساب
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
