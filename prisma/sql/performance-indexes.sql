-- فهارس أداء إضافية (Partial + Trigram)
-- التشغيل: npx prisma db execute --file prisma/sql/performance-indexes.sql

-- pg_trgm في schema extensions (توصية Supabase Security Advisor)
CREATE SCHEMA IF NOT EXISTS extensions;
GRANT USAGE ON SCHEMA extensions TO PUBLIC;

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_extension e
    JOIN pg_namespace n ON n.oid = e.extnamespace
    WHERE e.extname = 'pg_trgm'
      AND n.nspname = 'public'
  ) THEN
    ALTER EXTENSION pg_trgm SET SCHEMA extensions;
  END IF;
END
$$;

-- تفرد الأسماء/الرموز للعناصر النشطة فقط (بدل إعادة تسمية عند الحذف الناعم)
ALTER TABLE "Category" DROP CONSTRAINT IF EXISTS "Category_organizationId_name_key";
CREATE UNIQUE INDEX IF NOT EXISTS "Category_org_name_active_key"
  ON "Category" ("organizationId", name)
  WHERE "deletedAt" IS NULL;

ALTER TABLE "Item" DROP CONSTRAINT IF EXISTS "Item_organizationId_code_key";
CREATE UNIQUE INDEX IF NOT EXISTS "Item_org_code_active_key"
  ON "Item" ("organizationId", code)
  WHERE "deletedAt" IS NULL AND code IS NOT NULL;

ALTER TABLE "Machine" DROP CONSTRAINT IF EXISTS "Machine_organizationId_name_key";
CREATE UNIQUE INDEX IF NOT EXISTS "Machine_org_name_active_key"
  ON "Machine" ("organizationId", name)
  WHERE "deletedAt" IS NULL;

-- أدوات نشطة فقط (الأكثر استخداماً في القوائم)
CREATE INDEX IF NOT EXISTS "Item_org_active_name_idx"
  ON "Item" ("organizationId", name)
  WHERE "deletedAt" IS NULL;

CREATE INDEX IF NOT EXISTS "Item_org_active_category_idx"
  ON "Item" ("organizationId", "categoryId")
  WHERE "deletedAt" IS NULL;

-- بحث ILIKE بالاسم/الرمز
CREATE INDEX IF NOT EXISTS "Item_name_trgm_idx"
  ON "Item" USING gin (name extensions.gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "Item_code_trgm_idx"
  ON "Item" USING gin (code extensions.gin_trgm_ops)
  WHERE code IS NOT NULL;

-- تصنيفات / مكائن نشطة
CREATE INDEX IF NOT EXISTS "Category_org_active_idx"
  ON "Category" ("organizationId", name)
  WHERE "deletedAt" IS NULL;

CREATE INDEX IF NOT EXISTS "Machine_org_active_idx"
  ON "Machine" ("organizationId", name)
  WHERE "deletedAt" IS NULL;

-- حركات: تصفية بالقائمة + النوع
CREATE INDEX IF NOT EXISTS "Transaction_org_type_created_idx"
  ON "Transaction" ("organizationId", type, "createdAt" DESC);

-- حركات: تقرير مكينة
CREATE INDEX IF NOT EXISTS "Transaction_org_machine_created_idx"
  ON "Transaction" ("organizationId", "machineId", "createdAt" DESC)
  WHERE "machineId" IS NOT NULL;

-- حركات: اشتقاق آخر حركة ضمن المؤسسة (DISTINCT ON / dashboard)
CREATE INDEX IF NOT EXISTS "Transaction_org_item_created_idx"
  ON "Transaction" ("organizationId", "itemId", "createdAt" DESC);

-- حسابات ضمن مؤسسة
CREATE INDEX IF NOT EXISTS "Profile_org_active_idx"
  ON "Profile" ("organizationId", "isActive");

ANALYZE "Item";
ANALYZE "Transaction";
ANALYZE "Category";
ANALYZE "Machine";
ANALYZE "Profile";
