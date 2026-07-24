import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { UsersManager } from "@/components/users/users-manager";
import { PageHeader, PageShell } from "@/components/layout/page-header";

export default async function UsersPage() {
  const { profile } = await requireUser();
  if (profile.role !== "ADMIN") redirect("/dashboard");

  const users = await prisma.profile.findMany({
    where: { organizationId: profile.organizationId },
    orderBy: { createdAt: "asc" },
    select: { id: true, fullName: true, role: true, isActive: true },
  });

  return (
    <PageShell>
      <PageHeader
        title="الحسابات"
        description="إدارة أدوار المستخدمين وإضافة حسابات"
      />
      <UsersManager users={users} currentUserId={profile.id} />
    </PageShell>
  );
}
