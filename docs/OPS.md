# تشغيل الإنتاج — نسخ احتياطي، ترحيل، وحدود المجاني

## 1) الترحيل عند النشر

أمر البناء (`npm run build` / Vercel):

```bash
node scripts/db-migrate-deploy.mjs && prisma generate && next build --webpack
```

- يطبّق `prisma migrate deploy` تلقائياً قبل البناء.
- للتخطّي المؤقت (بناء محلي بلا DB): `SKIP_DB_MIGRATE=1 npm run build`
- بعد تغيير ملفات `prisma/sql/*` أو أول مرة: `npm run db:sql`

## 2) النسخ الاحتياطي

### تلقائي من المشروع

```bash
npm run db:backup
```

يكتب ملف JSON في `backups/` (مستثنى من Git) لكل الجداول الأساسية عبر `DIRECT_URL`/`DATABASE_URL`.

يُفضَّل تشغيله قبل ترحيلات كبيرة وبعد تغييرات مهمة.

### منصة Supabase

إن توفّر Backups/PITR في لوحة Supabase فهو طبقة إضافية. النسخ عبر `db:backup` يعمل بدون إعداد يدوي في اللوحة.

تصدير Excel/PDF من التقارير **ليس** استعادة لقاعدة البيانات.

## 3) حد المعدّل (بدون Upstash)

الترتيب: **Upstash** (إن وُجد) → **جدول `RateLimitBucket` في Postgres** → ذاكرة العملية.

لا حاجة لإعداد Redis يدوياً؛ الحد موحّد عبر مثيلات Vercel عبر Postgres.

## 5) Supabase Security Advisor

بعد `npm run db:sql` يُطبَّق `security-hardening.sql` (RLS على `_prisma_migrations`، تقييد EXECUTE على الدوال).

**Leaked password protection** في Auth → Providers → Email يتطلب **خطة Pro** على Supabase؛ على المجاني يبقى تحذيراً في Advisor. التطبيق يتحقق من قوة كلمة المرور محلياً.

لإعادة فحص Advisor: Supabase Dashboard → Advisors → Security → **Rerun linter**.

| العَرَض | السبب الشائع | ماذا يفعل التطبيق | ماذا يحدث تلقائياً / العلاج |
|---------|--------------|-------------------|------------------------------|
| دخول يرفض بعد محاولات كثيرة | Rate limit | رسالة عربية بالمهلة | حد Postgres مشترك |
| أخطاء عامة / 5xx | مشروع Supabase متوقف | رسائل عامة أو صفحة خطأ | راجع لوحة Supabase Billing |
| أخطاء DB متقطعة | نفاد اتصالات | فشل الطلب | `pgbouncer=true` و`connection_limit=1` في `DATABASE_URL` |
| مهلة دوال / 504 | حد Vercel | فشل الصفحة | التقارير مُقسَّمة الصفحات |
| الموقع لا يفتح من شبكتك فقط | حجب Vercel | وكيل Cloudflare إن لزم | `cloudflare/access-proxy.js` |

## 5) متغيرات إلزامية في الإنتاج

عند الإقلاع يتحقق السيرفر من:

- `DATABASE_URL`
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL` (عندما `NODE_ENV=production`)

موصى به: `SUPABASE_SERVICE_ROLE_KEY`، `DIRECT_URL` للترحيل والنسخ الاحتياطي.
