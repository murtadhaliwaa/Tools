"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signupAction, type ActionResult } from "@/actions";
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

export function SignupForm({ needsBootstrap }: { needsBootstrap: boolean }) {
  const [state, action, pending] = useActionState(signupAction, initial);

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl">إنشاء حساب</CardTitle>
        <CardDescription>
          {needsBootstrap
            ? "إقلاع النظام: أول حساب يصبح مديراً ويتطلب رمز الإقلاع من متغيرات البيئة."
            : "التسجيل مغلق إلا إذا فعّله المدير، والحسابات الجديدة تحتاج موافقة."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">الاسم الكامل</Label>
            <Input id="fullName" name="fullName" required />
          </div>
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
            <Label htmlFor="password">كلمة المرور</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              dir="ltr"
            />
            <p className="text-xs text-muted-foreground">
              8 أحرف على الأقل، مع حرف ورقم
            </p>
          </div>
          {needsBootstrap ? (
            <div className="space-y-2">
              <Label htmlFor="bootstrapSecret">رمز الإقلاع</Label>
              <Input
                id="bootstrapSecret"
                name="bootstrapSecret"
                type="password"
                required
                autoComplete="off"
                dir="ltr"
              />
              <p className="text-xs text-muted-foreground">
                نفس قيمة BOOTSTRAP_SECRET في البيئة (16 حرفاً على الأقل)
              </p>
            </div>
          ) : null}
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
            loadingText="جاري الإنشاء..."
          >
            إنشاء الحساب
          </LoadingButton>
          <p className="text-center text-sm text-muted-foreground">
            لديك حساب؟{" "}
            <Link href="/login" className="text-foreground underline">
              تسجيل الدخول
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
