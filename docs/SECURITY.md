# أمان التطبيق — ملخص قصير

## طبقات الحماية الحالية

1. **Middleware**: يمنع غير المسجّلين، ويمنع غير المدير من `/categories` `/users` `/reports/monthly` `/settings` عبر كوكي `app_role`.
2. **Server Actions / Pages**: `requireUser` / `requireRole` مصدر الحقيقة من جدول `Profile`.
3. **RLS في Postgres**: طبقة إضافية عند الوصول عبر PostgREST/Supabase client. مسار Prisma يستخدم connection string وقد يتجاوز RLS — لذلك لا تعتمد على RLS وحدها.

## سياسة الأدوار (مقصودة)

| الدور | الصلاحيات |
|--------|-----------|
| **ADMIN** | كل شيء: التصنيفات، الحسابات، الإعدادات، التقرير الشهري، حذف أي حركة، CRUD الأدوات/المكائن |
| **KEEPER** (أمين عدة) | تسجيل الحركات، عرض/إدارة الأدوات والمكائن، التقارير (عدا الشهري). لا يصل لـ `/categories` `/users` `/settings` `/reports/monthly` |

الأدوات والمكائن مفتوحة للأمين عمداً (عمل يومي للمستودع). التصنيفات للمدير فقط (هيكلة الكتالوج).

## ملاحظات إنتاج

- اترك `allowPublicSignup=false` إلا عند الحاجة.
- فعّل الحسابات الجديدة يدوياً من صفحة الحسابات.
- أضف `NEXT_PUBLIC_SITE_URL` لروابط استعادة كلمة المرور.
- استخدم Pooler مع `pgbouncer=true` ويفضّل `connection_limit=1` على Vercel.
- بعد `prisma migrate deploy` على الإنتاج نفّذ مرة: `npm run db:sql` (CHECK + سلامة المؤسسة + RLS + فهارس). الـ migration وحدها لا تكفي.

## سلامة البيانات في Postgres

- كل العلاقات `ON DELETE RESTRICT` — لا مسح متسلسل.
- تريغرات `org-integrity.sql` تمنع ربط أداة/حركة عبر مؤسسات مختلفة.
- لا يُحذف تصنيف ناعم إن وُجدت أدوات نشطة مرتبطة به.
- Prisma يتجاوز RLS؛ لا تعتمد على السياسات وحدها.
