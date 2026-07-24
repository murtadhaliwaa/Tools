/** تحويل أخطاء Prisma/التطبيق إلى رسائل عربية واضحة */
export function toArabicErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return "حدث خطأ غير متوقع";
  }

  const message = error.message;

  if (
    message.includes("Unique constraint") ||
    message.includes("unique constraint") ||
    (error as { code?: string }).code === "P2002"
  ) {
    const target = (error as { meta?: { target?: string[] } }).meta?.target;
    if (target?.includes("email") || message.toLowerCase().includes("email")) {
      return "هذا البريد الإلكتروني مستخدم مسبقاً";
    }
    if (target?.includes("code") || message.toLowerCase().includes("code")) {
      return "رمز الأداة مستخدم مسبقاً";
    }
    if (target?.includes("name") || message.toLowerCase().includes("name")) {
      return "هذا الاسم مستخدم مسبقاً";
    }
    return "البيانات مكررة — تحقق من الاسم أو الرمز";
  }

  if ((error as { code?: string }).code === "P2025") {
    return "العنصر المطلوب غير موجود";
  }

  // رسائل عربية مُرماة مسبقاً من الخدمات
  if (/[\u0600-\u06FF]/.test(message)) {
    return message;
  }

  return "تعذر تنفيذ العملية. حاول مرة أخرى";
}
