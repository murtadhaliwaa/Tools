import Link from "next/link";
import { ROLE_PERMISSIONS } from "@/lib/role-help";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const FAQ = [
  {
    q: "سجّل شخص حساباً ولا يستطيع الدخول؟",
    a: "الحسابات الجديدة غالباً «موقوفة». افتح الحسابات → اضغط تفعيل. بدون تفعيل يُرفض الدخول.",
  },
  {
    q: "ما الفرق بين المدير وأمين العدة؟",
    a: `${ROLE_PERMISSIONS.ADMIN.label}: ${ROLE_PERMISSIONS.ADMIN.can.join("، ")}. ${ROLE_PERMISSIONS.KEEPER.label}: ${ROLE_PERMISSIONS.KEEPER.can.join("، ")}. أمين العدة لا يصل إلى: ${ROLE_PERMISSIONS.KEEPER.cannot.join("، ")}.`,
  },
  {
    q: "كيف أفتح أو أغلق التسجيل العام؟",
    a: "من الإعدادات → «السماح بالتسجيل العام». المفضّل إنشاء الحسابات من صفحة الحسابات مباشرة. عند فتح التسجيل راجع الموقوفين وفعّلهم.",
  },
  {
    q: "نسيت كلمة المرور / رسالة إعدادات الموقع غير مكتملة؟",
    a: "استعادة كلمة المرور تحتاج رابط الموقع الصحيح على الاستضافة (NEXT_PUBLIC_SITE_URL). إن ظهرت الرسالة تواصل مع من يدير الاستضافة.",
  },
  {
    q: "حذفت أداة أو مكينة بالخطأ؟",
    a: "الحذف من الكتالوج إخفاء من القوائم (ناعم) وليس مسحاً للحركات. لا يوجد زر استعادة في الواجهة حالياً — راجع المورّد إن لزم.",
  },
  {
    q: "ملف Excel ناقص؟",
    a: "التصدير محدود بعدد صفوف (غالباً 2000، ومسار الأداة 500). قلّص الفترة أو الفلاتر ثم صدّر مرة أخرى.",
  },
  {
    q: "رسالة محاولات كثيرة؟",
    a: "حماية من تكرار الدخول/التسجيل. انتظر المدة المذكورة ثم أعد المحاولة.",
  },
  {
    q: "الموقع لا يفتح ويبدو أن الإنترنت يعمل؟",
    a: "جرّب صفحة عدم الاتصال ومسح كاش التطبيق إن وُجدت، أو شبكة أخرى. أحياناً يكون الخادم محجوباً من شبكتك فقط.",
  },
  {
    q: "هل تصدير التقارير نسخة احتياطية؟",
    a: "لا. التقارير لقطة تشغيلية. استعادة قاعدة البيانات تتم عبر المورّد / النسخ الاحتياطي للمنصة.",
  },
] as const;

export function AdminHelpContent() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>روابط سريعة</CardTitle>
          <CardDescription>المهام الأكثر شيوعاً للمدير</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3 text-sm">
          <Link href="/users" className="underline underline-offset-2">
            تفعيل الحسابات
          </Link>
          <Link href="/settings" className="underline underline-offset-2">
            إعدادات التسجيل
          </Link>
          <Link href="/transactions/new" className="underline underline-offset-2">
            تسجيل حركة
          </Link>
          <Link href="/offline" className="underline underline-offset-2">
            صفحة عدم الاتصال
          </Link>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {FAQ.map((item) => (
          <details
            key={item.q}
            className="rounded-lg border bg-card p-3 open:shadow-none"
          >
            <summary className="cursor-pointer text-sm font-medium">
              {item.q}
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {item.a}
            </p>
          </details>
        ))}
      </div>
    </div>
  );
}
