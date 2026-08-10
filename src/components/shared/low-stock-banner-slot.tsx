import { getLowStockCountCached } from "@/lib/cache";
import { LowStockBanner } from "@/components/shared/low-stock-banner";

/** يجلب العدد على السيرفر ليبقى الشريط بلا تكلفة على العميل */
export async function LowStockBannerSlot({
  organizationId,
}: {
  organizationId: string;
}) {
  const count = await getLowStockCountCached(organizationId);
  if (count <= 0) return null;
  // key يعيد إظهار الشريط تلقائياً عند تغيّر عدد المواد المنخفضة
  return <LowStockBanner key={count} count={count} />;
}
