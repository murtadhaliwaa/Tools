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

1. أنشئ حساباً من `/signup` — **أول مستخدم يصبح مديراً تلقائياً**
2. في Supabase → Authentication → Providers → Email: عطّل "Confirm email" للتطوير فقط
3. بعد إنشاء الحساب (اختياري لبيانات تجريبية):
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
3. Build Command: `prisma generate && next build --webpack`
4. بعد أول نشر (أو بعد migrate)، نفّذ على قاعدة الإنتاج مرة:
   ```bash
   npm run db:sql
   ```
   يطبّق: CHECK لـ machineId + تريغرات نفس-المؤسسة + RLS + فهارس جزئية/trigram.
   **الـ migration وحدها لا تكفي لهذه الطبقات.**
5. Deploy

## الأوامر

| الأمر | الوظيفة |
|---|---|
| `npm run dev` | تطوير |
| `npm run build` | بناء إنتاج + PWA |
| `npm run db:setup` | مزامنة المخطط + SQL (قيود/RLS/فهارس) |
| `npm run db:sql` | تطبيق ملفات SQL فقط |
| `npm run db:indexes` | فهارس الأداء فقط |
| `npm run db:seed` | بيانات تجريبية |
| `npm run db:studio` | مستعرض قاعدة البيانات |
| `npm test` | اختبارات الوحدة |

## ملاحظات أمان

- لا ترفع ملفات `.env*` إلى Git
- `SUPABASE_SERVICE_ROLE_KEY` للخادم فقط — لا تضعه في الكود أو الواجهة
