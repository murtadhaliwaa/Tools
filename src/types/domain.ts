/**
 * حالات الأداة المشتقة من آخر Transaction + الكمية.
 *
 * SEND_TO_REPAIR → IN_REPAIR
 * quantity <= 0  → ISSUED (عند مكينة / بلا رصيد)
 * وإلا           → AVAILABLE
 */
export const ItemStatus = {
  AVAILABLE: "AVAILABLE",
  ISSUED: "ISSUED",
  IN_REPAIR: "IN_REPAIR",
} as const;

export type ItemStatus = (typeof ItemStatus)[keyof typeof ItemStatus];

export const ItemStatusLabel: Record<ItemStatus, string> = {
  AVAILABLE: "متوفرة",
  ISSUED: "عند مكينة",
  IN_REPAIR: "تحت التصليح",
};

export const TransactionTypeLabel = {
  ADDITION: "إضافة أداة جديدة",
  STOCK_ADDITION: "إضافة على المواد",
  ISSUE: "صرف",
  RETURN_FROM_MACHINE: "إرجاع من مكينة",
  SEND_TO_REPAIR: "إخراج للتصليح",
  RETURN_FROM_REPAIR: "رجوع من التصليح",
} as const;

export const RoleLabel = {
  ADMIN: "مدير",
  KEEPER: "أمين عدة",
} as const;
