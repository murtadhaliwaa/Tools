/**
 * تسريع القوائم شبه الثابتة عبر Cache + Tags.
 * نمرّر organizationId كمفتاح صريح داخل الدالة المخزّنة.
 */
import { unstable_cache, revalidateTag } from "next/cache";
import { prisma } from "@/lib/db";
import { getItemsForTransactionForm } from "@/services/items";

export const CACHE_TAGS = {
  categories: (orgId: string) => `categories-${orgId}`,
  machines: (orgId: string) => `machines-${orgId}`,
  itemOptions: (orgId: string) => `item-options-${orgId}`,
  formItems: (orgId: string) => `form-items-${orgId}`,
} as const;

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

/** خيارات فلتر الأدوات — أسماء فقط، بدون حالة */
export function getItemFilterOptionsCached(organizationId: string) {
  return unstable_cache(
    async (orgId: string) =>
      prisma.item.findMany({
        where: { organizationId: orgId, deletedAt: null },
        select: { id: true, name: true, code: true },
        orderBy: { name: "asc" },
        take: 500,
      }),
    [`item-filter-options`],
    { revalidate: 120, tags: [CACHE_TAGS.itemOptions(organizationId)] },
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
      const { getDashboardStats } = await import("@/services/items");
      return getDashboardStats(orgId);
    },
    [`dashboard-stats`],
    { revalidate: 30, tags: [CACHE_TAGS.formItems(organizationId)] },
  )(organizationId);
}

export function bustCatalogCache(organizationId: string) {
  revalidateTag(CACHE_TAGS.categories(organizationId), "max");
  revalidateTag(CACHE_TAGS.machines(organizationId), "max");
}

export function bustItemOptionsCache(organizationId: string) {
  revalidateTag(CACHE_TAGS.itemOptions(organizationId), "max");
  revalidateTag(CACHE_TAGS.formItems(organizationId), "max");
}
