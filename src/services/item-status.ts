import { ItemStatus, type ItemStatus as ItemStatusType } from "@/types/domain";

type TransactionTypeLike =
  | "ADDITION"
  | "ISSUE"
  | "RETURN_FROM_MACHINE"
  | "SEND_TO_REPAIR"
  | "RETURN_FROM_REPAIR"
  | null
  | undefined;

/**
 * اشتقاق حالة الأداة من آخر حركة + الكمية المتبقية.
 * - تحت التصليح دائماً من SEND_TO_REPAIR
 * - إن الكمية > 0 تبقى متوفرة حتى لو كان آخر صرف ISSUE
 * - إن الكمية = 0 وآخر حركة صرف → عند مكينة
 */
export function deriveItemStatus(
  lastTransactionType: TransactionTypeLike,
  quantity = 1,
): ItemStatusType {
  if (lastTransactionType === "SEND_TO_REPAIR") {
    return ItemStatus.IN_REPAIR;
  }

  if (quantity <= 0) {
    return ItemStatus.ISSUED;
  }

  switch (lastTransactionType) {
    case "ISSUE":
      // لا يزال هناك رصيد → متوفرة للصرف مرة أخرى
      return ItemStatus.AVAILABLE;
    case "ADDITION":
    case "RETURN_FROM_REPAIR":
    case "RETURN_FROM_MACHINE":
    case null:
    case undefined:
      return ItemStatus.AVAILABLE;
    default:
      return ItemStatus.AVAILABLE;
  }
}
