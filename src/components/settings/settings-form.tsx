"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { updateOrganizationSettingsAction } from "@/actions";
import { LoadingButton } from "@/components/shared/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ui } from "@/lib/ui";

export function SettingsForm({
  name,
  allowPublicSignup,
}: {
  name: string;
  allowPublicSignup: boolean;
}) {
  const [orgName, setOrgName] = useState(name);
  const [publicSignup, setPublicSignup] = useState(allowPublicSignup);
  const [pending, startTransition] = useTransition();

  function onSave() {
    startTransition(async () => {
      const result = await updateOrganizationSettingsAction({
        name: orgName,
        allowPublicSignup: publicSignup,
      });
      if (result.success) toast.success(result.message);
      else toast.error(result.message);
    });
  }

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>إعدادات الورشة</CardTitle>
        <CardDescription>
          التحكم باسم المؤسسة وفتح/إغلاق التسجيل العام
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="orgName">اسم الورشة</Label>
          <Input
            id="orgName"
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
          />
        </div>
        <label className="flex items-start gap-3 rounded-lg border p-3 text-sm">
          <Checkbox
            checked={publicSignup}
            onCheckedChange={(checked) =>
              setPublicSignup(checked === true)
            }
          />
          <span>
            <span className="font-medium">السماح بالتسجيل العام</span>
            <span className="mt-1 block text-muted-foreground">
              الحسابات الجديدة تبقى غير مفعّلة حتى يوافق المدير من{" "}
              <Link
                href="/users"
                className="underline underline-offset-2"
                onClick={(e) => e.stopPropagation()}
              >
                صفحة الحسابات
              </Link>
            </span>
          </span>
        </label>

        <div className="rounded-lg border bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground">
          <p className="font-medium text-foreground">قائمة سريعة للتسجيل</p>
          <ol className="mt-1.5 list-inside list-decimal space-y-1">
            <li>
              الطريق المفضّل: أنشئ الحسابات من{" "}
              <Link href="/users" className="underline underline-offset-2">
                الحسابات
              </Link>{" "}
              (مفعّلة فوراً).
            </li>
            <li>
              إن فتحت التسجيل العام: راجع الحسابات الموقوفة وفعّلها يدوياً.
            </li>
            <li>أغلق التسجيل العام عندما لا تحتاج طلبات جديدة.</li>
          </ol>
          <p className="mt-2">
            دليل أوضح:{" "}
            <Link href="/help" className="underline underline-offset-2">
              المساعدة
            </Link>
          </p>
        </div>

        <LoadingButton
          onClick={onSave}
          loading={pending}
          loadingText={ui.saving}
          disabled={orgName.trim().length < 2}
        >
          حفظ الإعدادات
        </LoadingButton>
      </CardContent>
    </Card>
  );
}
