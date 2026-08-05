/**
 * تسريع القوائم شبه الثابتة عبر Cache + Tags.
 * نمرّر organizationId كمفتاح صريح داخل الدالة المخزّنة.
 */
import { unstable_cache, revalidateTag } from "next/cache";
import { prisma } from "@/lib/db";
import { getItemsForTransactionForm } from "@/services/item-form";
import { listCategories, listMachines } from "@/services/catalog";
import { listOrganizationUsers } from "@/services/users";

export const CACHE_TAGS = {
  categories: (orgId: string) => `categories-${orgId}`,
  machines: (orgId: string) => `machines-${orgId}`,
  itemOptions: (orgId: string) => `item-options-${orgId}`,
  formItems: (orgId: string) => `form-items-${orgId}`,
  users: (orgId: string) => `users-${orgId}`,
  reports: (orgId: string) => `reports-${orgId}`,
} as const;

/** خيارات فلتر التصنيفات — أسماء فقط */
export function getCategoriesCached(organizationId: string) {
  return unstable_cache(
    async (orgId: string) =>
      prisma.category.findMany({
        where: { organizationId: orgId, deletedAt: null },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
    [`categories-list`],
    { revalidate: 300, tags: [CACHE_TAGS.categories(organizationId)] },
  )(organizationId);
}

/** تصنيفات صفحة الإدارة (مع العدد) */
export function getCategoriesAdminCached(organizationId: string) {
  return unstable_cache(
    async (orgId: string) => listCategories(orgId),
    [`categories-admin`],
    { revalidate: 120, tags: [CACHE_TAGS.categories(organizationId)] },
  )(organizationId);
}

/** خيارات فلتر المكائن — أسماء فقط */
export function getMachinesCached(organizationId: string) {
  return unstable_cache(
    async (orgId: string) =>
      prisma.machine.findMany({
        where: { organizationId: orgId, deletedAt: null },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
    [`machines-list`],
    { revalidate: 300, tags: [CACHE_TAGS.machines(organizationId)] },
  )(organizationId);
}

/** مكائن صفحة الإدارة (مع الموقع) */
export function getMachinesAdminCached(organizationId: string) {
  return unstable_cache(
    async (orgId: string) => listMachines(orgId),
    [`machines-admin`],
    { revalidate: 120, tags: [CACHE_TAGS.machines(organizationId)] },
  )(organizationId);
}

/** أدوات نموذج الحركة مع الحالة — كاش قصير */
export function getFormItemsCached(organizationId: string) {
  return unstable_cache(
    async (orgId: string) => getItemsForTransactionForm(orgId, { limit: 40 }),
    [`form-items-status`],
    { revalidate: 30, tags: [CACHE_TAGS.formItems(organizationId)] },
  )(organizationId);
}

export function getDashboardStatsCached(organizationId: string) {
  return unstable_cache(
    async (orgId: string) => {
      const { getDashboardStats } = await import("@/services/dashboard");
      return getDashboardStats(orgId);
    },
    [`dashboard-stats`],
    { revalidate: 30, tags: [CACHE_TAGS.formItems(organizationId)] },
  )(organizationId);
}

export function getUsersCached(organizationId: string) {
  return unstable_cache(
    async (orgId: string) => listOrganizationUsers(orgId),
    [`users-list`],
    { revalidate: 60, tags: [CACHE_TAGS.users(organizationId)] },
  )(organizationId);
}

/** ملخص شهري — يُبطل عند أي كتابة حركة */
export function getMonthlySummaryCached(
  organizationId: string,
  year: number,
  month: number,
) {
  return unstable_cache(
    async (orgId: string, y: number, m: number) => {
      const { getMonthlySummary } = await import("@/services/reports");
      return getMonthlySummary({ organizationId: orgId, year: y, month: m });
    },
    [`monthly-summary`, String(year), String(month)],
    { revalidate: 120, tags: [CACHE_TAGS.reports(organizationId)] },
  )(organizationId, year, month);
}

/** أكثر الأدوات صرفاً (للرسوم) */
export function getTopIssuedItemsCached(organizationId: string, limit = 8) {
  return unstable_cache(
    async (orgId: string, take: number) => {
      const { getTopIssuedItems } = await import("@/services/reports");
      return getTopIssuedItems(orgId, take);
    },
    [`top-issued`, String(limit)],
    { revalidate: 120, tags: [CACHE_TAGS.reports(organizationId)] },
  )(organizationId, limit);
}

export function bustCatalogCache(organizationId: string) {
  revalidateTag(CACHE_TAGS.categories(organizationId), "max");
  revalidateTag(CACHE_TAGS.machines(organizationId), "max");
}

export function bustItemOptionsCache(organizationId: string) {
  revalidateTag(CACHE_TAGS.itemOptions(organizationId), "max");
  revalidateTag(CACHE_TAGS.formItems(organizationId), "max");
}

export function bustReportsCache(organizationId: string) {
  revalidateTag(CACHE_TAGS.reports(organizationId), "max");
}

export function bustUsersCache(organizationId: string) {
  revalidateTag(CACHE_TAGS.users(organizationId), "max");
}
