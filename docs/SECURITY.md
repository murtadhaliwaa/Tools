# أمان التطبيق — ملخص قصير

## طبقات الحماية الحالية

1. **Middleware**: يمنع غير المسجّلين، ويمنع غير المدير من `/categories` `/users` `/reports/monthly` `/settings` عبر كوكي `app_role`.
2. **Server Actions / Pages**: `requireUser` / `requireRole` مصدر الحقيقة من جدول `Profile`.
3. **RLS + FORCE في Postgres**: حماية PostgREST/`authenticated`. دور Prisma الموصى به `tool_tracker_app` (غير superuser) مع سياسات `FOR ALL` تحت FORCE (بدل BYPASSRLS غير المتاح عادة على Supabase) — عزل المؤسسات للتطبيق عبر الكود + تريغرات `org-integrity`.

## دور قاعدة البيانات للتطبيق

| الاتصال | الدور | الاستخدام |
|---------|--------|-----------|
| `DIRECT_URL` | `postgres` (أو مالك الترحيل) | `prisma migrate` / تغيير المخطط فقط |
| `DATABASE_URL` | `tool_tracker_app` | تشغيل التطبيق (Prisma) |

الإعداد مرة واحدة (SQL Editor كمالك):

```sql
-- بعد npm run db:sql
ALTER ROLE tool_tracker_app PASSWORD 'كلمة-مرور-قوية-عشوائية';
```

ثم حدّث `DATABASE_URL` في Vercel ليستخدم المستخدم `tool_tracker_app` بدل `postgres` (أبقِ pooler و`connection_limit=1`).

`BYPASSRLS` غير مطلوب: سياسات `app_all_*` لدور `tool_tracker_app` تحت FORCE RLS تسمح لـ Prisma بالعمل مع PgBouncer، بينما `authenticated` يبقى مقيّداً بـ `auth.uid()` والمؤسسة.

## سياسة الأدوار (مقصودة)

| الدور | الصلاحيات |
|--------|-----------|
| **ADMIN** | كل شيء: التصنيفات، الحسابات، الإعدادات، التقرير الشهري، حذف أي حركة، CRUD الأدوات/المكائن |
| **KEEPER** (أمين عدة) | تسجيل الحركات، عرض/إدارة الأدوات والمكائن، التقارير (عدا الشهري). لا يصل لـ `/categories` `/users` `/settings` `/reports/monthly` |

الأدوات والمكائن مفتوحة للأمين عمداً (عمل يومي للمستودع). التصنيفات للمدير فقط (هيكلة الكتالوج).

## ملاحظات إنتاج

- اضبط `BOOTSTRAP_SECRET` (≥16 حرفاً) قبل أول تسجيل مدير، ثم احذفه أو دوّره بعد الإقلاع إن أردت.
- بعد إنشاء أول مدير: في Supabase → Authentication → Providers → Email عطّل **Sign ups** (أو اترك Confirm email مفعّلاً وقيّد الدعوات). لا تعتمد على صفحة التطبيق وحدها.
- اترك `allowPublicSignup=false` إلا عند الحاجة المؤقتة.
- فعّل الحسابات الجديدة يدوياً من صفحة الحسابات.
- أضف `NEXT_PUBLIC_SITE_URL` لروابط استعادة كلمة المرور.
- استخدم Pooler مع `pgbouncer=true` ويفضّل `connection_limit=1` على Vercel.
- أضف `UPSTASH_REDIS_REST_URL` و `UPSTASH_REDIS_REST_TOKEN` في الإنتاج — بدونها تُرفض login/signup/forgot/reset (fail-closed). التطوير المحلي يمكنه الاعتماد على ذاكرة العملية.
- CSP في الإنتاج بدون `unsafe-eval`؛ مسار `/auth/signout` يرفض الطلبات العابرة للمواقع (Sec-Fetch-Site / Origin).
- بعد `prisma migrate deploy` على الإنتاج نفّذ: `npm run db:sql` (CHECK + سلامة المؤسسة + دور التطبيق + RLS/FORCE + فهارس). الـ migration وحدها لا تكفي. CI يشغّل `db:sql` كاملاً.

## سلامة البيانات في Postgres

- كل العلاقات `ON DELETE RESTRICT` — لا مسح متسلسل.
- تريغرات `org-integrity.sql` تمنع ربط أداة/حركة عبر مؤسسات مختلفة.
- لا يُحذف تصنيف ناعم إن وُجدت أدوات نشطة مرتبطة به.
- سياسات SELECT للكتالوج تستثني `deletedAt` لـ PostgREST.
- مسار Prisma يتجاوز تقييد المستأجر في RLS عبر سياسات `tool_tracker_app`؛ لا تعتمد على السياسات وحدها لعزل المستأجرين في Server Actions.
