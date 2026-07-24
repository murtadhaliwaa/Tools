# أمان التطبيق — ملخص قصير

## طبقات الحماية الحالية

1. **Middleware**: يمنع غير المسجّلين، ويمنع غير المدير من `/categories` `/users` `/reports/monthly` `/settings` عبر كوكي `app_role`.
2. **Server Actions / Pages**: `requireUser` / `requireRole` مصدر الحقيقة من جدول `Profile`.
3. **RLS في Postgres**: طبقة إضافية عند الوصول عبر PostgREST/Supabase client. مسار Prisma يستخدم connection string وقد يتجاوز RLS — لذلك لا تعتمد على RLS وحدها.

## ملاحظات إنتاج

- اترك `allowPublicSignup=false` إلا عند الحاجة.
- فعّل الحسابات الجديدة يدوياً من صفحة الحسابات.
- أضف `NEXT_PUBLIC_SITE_URL` لروابط استعادة كلمة المرور.
- استخدم Pooler مع `pgbouncer=true` ويفضّل `connection_limit=1` على Vercel.
