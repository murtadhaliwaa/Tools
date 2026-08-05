import { requireAdminPage } from "@/lib/auth";
import { getUsersCached } from "@/lib/cache";
import { UsersManager } from "@/components/users/users-manager";
import { PageHeader, PageShell } from "@/components/layout/page-header";

export default async function UsersPage() {
  const { profile } = await requireAdminPage();
  const users = await getUsersCached(profile.organizationId);

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
