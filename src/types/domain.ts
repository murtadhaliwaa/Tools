/**
 * حالات الأداة المشتقة من آخر Transaction — ليست أعمدة في قاعدة البيانات.
 *
 * ADDITION | RETURN_FROM_REPAIR → AVAILABLE
 * ISSUE                         → ISSUED (عند مكينة)
 * SEND_TO_REPAIR                → IN_REPAIR
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
  ADDITION: "إضافة",
  ISSUE: "صرف",
  SEND_TO_REPAIR: "إخراج للتصليح",
  RETURN_FROM_REPAIR: "رجوع من التصليح",
} as const;

export const RoleLabel = {
  ADMIN: "مدير",
  KEEPER: "أمين عدة",
} as const;
