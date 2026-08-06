# نظام تتبع الأدوات والعدة

تطبيق ويب عربي RTL لتتبع حركات العدة في الورشة (Next.js + Supabase + Prisma + PWA).

## التشغيل السريع

```bash
npm install
npm run db:setup
npm run db:seed
npm run dev
```

افتح: [http://localhost:3000](http://localhost:3000)

`db:setup` ينفّذ: `db push` + قيود CHECK + سياسات RLS + فهارس الأداء.

### أول استخدام

1. ضع في `.env.local` قيمة `BOOTSTRAP_SECRET` (16 حرفاً على الأقل)
2. أنشئ الحساب الأول من `/signup` مع رمز الإقلاع — يصبح مديراً
3. في Supabase → Authentication → Providers → Email:
   - للتطوير: يمكن تعطيل "Confirm email"
   - بعد الإقلاع (إنتاج): عطّل **Sign ups** العامة؛ أنشئ المستخدمين من لوحة المدير
4. بعد إنشاء الحساب (اختياري لبيانات تجريبية):
   ```bash
   npm run db:seed
   ```

## الميزات

- Auth + أدوار (Admin / Keeper) + Proxy + RLS
- لوحة تحكم مع إحصائيات سريعة
- تسجيل حركات مع بحث Autocomplete
- سجل حركات مع Pagination وتصفية
- CRUD الأدوات / التصنيفات / المكائن / الحسابات
- تقارير (مكينة، تصليح، شهري، سجل أداة) + تصدير CSV و Excel
- فهارس وأداء قاعدة البيانات + كاش للقوائم
- وضع نهاري / ليلي
- PWA قابل للتثبيت
- واجهة عربية RTL كاملة

## النشر على Vercel

1. ارفع المشروع إلى GitHub ثم استورده في [Vercel](https://vercel.com/new)
2. أضف متغيرات البيئة (انظر `.env.example`):
   - `DATABASE_URL` — مع `&connection_limit=1`
   - `DIRECT_URL`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_SITE_URL` — رابط الموقع المنشور
   - `BOOTSTRAP_SECRET` — لمرة الإقلاع الأولى فقط (≥16)
   - `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` — اختياري؛ بدونه يُستخدم جدول Postgres للحدّ الموحّد
3. Build Command (افتراضي في `vercel.json` / `npm run build`):
   `node scripts/db-migrate-deploy.mjs && prisma generate && next build --webpack`
   يطبّق ترحيلات Prisma تلقائياً. للتخطّي المحلي: `SKIP_DB_MIGRATE=1`.
4. بعد أول نشر (أو بعد تغيير `prisma/sql/*`)، نفّذ على قاعدة الإنتاج مرة:
   ```bash
   npm run db:sql
   ```
   يطبّق: CHECK + تريغرات نفس-المؤسسة + دور `tool_tracker_app` + RLS/FORCE + فهارس.
   **الـ migration وحدها لا تكفي لهذه الطبقات.**
5. (موصى به) عيّن كلمة مرور لـ `tool_tracker_app` وحدّث `DATABASE_URL` لهذا الدور؛ أبقِ `DIRECT_URL` للترحيلات كمالك
6. أنشئ أول مدير عبر `/signup` + رمز الإقلاع، ثم عطّل Sign ups في Supabase Auth
7. راجع [docs/OPS.md](docs/OPS.md) للنسخ الاحتياطي وحدود المجاني
8. سلّم العميل: [docs/ADMIN-AR.md](docs/ADMIN-AR.md) + [docs/HANDOFF-AR.md](docs/HANDOFF-AR.md) وصفحة **/help** في التطبيق
9. Deploy

## الأوامر

| الأمر | الوظيفة |
|---|---|
| `npm run dev` | تطوير |
| `npm run build` | ترحيل + بناء إنتاج + PWA |
| `npm run db:migrate:deploy` | تطبيق ترحيلات الإنتاج فقط |
| `npm run db:setup` | مزامنة المخطط + SQL (قيود/RLS/فهارس) |
| `npm run db:sql` | تطبيق ملفات SQL فقط |
| `npm run db:indexes` | فهارس الأداء فقط |
| `npm run db:seed` | بيانات تجريبية |
| `npm run db:studio` | مستعرض قاعدة البيانات |
| `npm test` | اختبارات الوحدة |

## ملاحظات أمان

- لا ترفع ملفات `.env*` إلى Git
- `SUPABASE_SERVICE_ROLE_KEY` و `BOOTSTRAP_SECRET` للخادم فقط — لا تضعهما في الواجهة
- بعد الإقلاع: عطّل التسجيل العام في Supabase Auth واترك `allowPublicSignup=false`
- في الإنتاج: حدّ المعدّل عبر Upstash أو جدول Postgres (`RateLimitBucket`) تلقائياً. انظر `docs/OPS.md` و`docs/SECURITY.md`.
- النسخ الاحتياطي: `npm run db:backup` — انظر `docs/OPS.md`
