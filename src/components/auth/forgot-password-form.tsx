"use client";

import { useActionState } from "react";
import Link from "next/link";
import { forgotPasswordAction, type ActionResult } from "@/actions";
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

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(
    forgotPasswordAction,
    initial,
  );

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl">استعادة كلمة المرور</CardTitle>
        <CardDescription>
          أدخل بريدك وسنرسل رابط إعادة التعيين إن وُجد الحساب
        </CardDescription>
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
          {state?.message ? (
            <p
              className={
                state.success
                  ? "text-sm text-foreground"
                  : "text-sm text-destructive"
              }
            >
              {state.message}
            </p>
          ) : null}
          <LoadingButton
            type="submit"
            className="w-full"
            loading={pending}
            loadingText="جاري الإرسال..."
          >
            إرسال الرابط
          </LoadingButton>
          <p className="text-center text-sm text-muted-foreground">
            <Link href="/login" className="underline">
              العودة لتسجيل الدخول
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
