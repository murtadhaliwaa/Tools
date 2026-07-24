"use client";

import { useState, useTransition } from "react";
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
              الحسابات الجديدة تبقى غير مفعّلة حتى يوافق المدير من صفحة الحسابات
            </span>
          </span>
        </label>
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
