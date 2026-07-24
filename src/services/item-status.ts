import { ItemStatus, type ItemStatus as ItemStatusType } from "@/types/domain";

type TransactionTypeLike =
  | "ADDITION"
  | "ISSUE"
  | "SEND_TO_REPAIR"
  | "RETURN_FROM_REPAIR"
  | null
  | undefined;

/**
 * اشتقاق حالة الأداة من نوع آخر حركة مسجّلة لها.
 * مصدر الحقيقة الوحيد — لا يوجد عمود status في جدول Item.
 */
export function deriveItemStatus(
  lastTransactionType: TransactionTypeLike,
): ItemStatusType {
  switch (lastTransactionType) {
    case "ISSUE":
      return ItemStatus.ISSUED;
    case "SEND_TO_REPAIR":
      return ItemStatus.IN_REPAIR;
    case "ADDITION":
    case "RETURN_FROM_REPAIR":
    case null:
    case undefined:
      return ItemStatus.AVAILABLE;
    default:
      return ItemStatus.AVAILABLE;
  }
}
