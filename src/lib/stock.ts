/** تنبيه المخزون المنخفض عندما الحد الأدنى > 0 والكمية ≤ الحد */

export function isLowStock(quantity: number, minQuantity: number): boolean {
  return minQuantity > 0 && quantity <= minQuantity;
}

export function lowStockSeverity(
  quantity: number,
  minQuantity: number,
): "critical" | "warning" | null {
  if (!isLowStock(quantity, minQuantity)) return null;
  return quantity <= 0 ? "critical" : "warning";
}
