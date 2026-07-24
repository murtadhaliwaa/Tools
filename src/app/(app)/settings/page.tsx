import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SettingsForm } from "@/components/settings/settings-form";
import { PageHeader, PageShell } from "@/components/layout/page-header";

export default async function SettingsPage() {
  const { profile } = await requireUser();
  if (profile.role !== "ADMIN") redirect("/dashboard");

  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: profile.organizationId },
    select: { name: true, allowPublicSignup: true },
  });

  return (
    <PageShell>
      <PageHeader
        title="الإعدادات"
        description="إعدادات المؤسسة والصلاحيات"
      />
      <SettingsForm
        name={org.name}
        allowPublicSignup={org.allowPublicSignup}
      />
    </PageShell>
  );
}
