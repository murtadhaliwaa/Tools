-- سياسات RLS لطبقة حماية إضافية على مستوى قاعدة البيانات
-- ملاحظة: التطبيق يستخدم Prisma عبر connection string (عادة يتجاوز RLS كـ table owner).
-- تُفعَّل هذه السياسات عند الوصول عبر Supabase client / PostgREST بمفتاح anon.

ALTER TABLE "Organization" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Profile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Category" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Item" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Machine" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Transaction" ENABLE ROW LEVEL SECURITY;

-- مساعدة: جلب organizationId للمستخدم الحالي
CREATE OR REPLACE FUNCTION public.current_profile_org_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT "organizationId" FROM "Profile" WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.current_profile_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT "role"::text FROM "Profile" WHERE id = auth.uid()
$$;

-- Profile: المستخدم يرى صفّه؛ المدير يرى كل صفوف مؤسسته
DROP POLICY IF EXISTS profile_select ON "Profile";
CREATE POLICY profile_select ON "Profile"
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR (
      public.current_profile_role() = 'ADMIN'
      AND "organizationId" = public.current_profile_org_id()
    )
  );

DROP POLICY IF EXISTS profile_update_self ON "Profile";
CREATE POLICY profile_update_self ON "Profile"
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Organization
DROP POLICY IF EXISTS org_select ON "Organization";
CREATE POLICY org_select ON "Organization"
  FOR SELECT TO authenticated
  USING (id = public.current_profile_org_id());

-- Category / Item / Machine: قراءة لكل أعضاء المؤسسة، كتابة للمدير
DROP POLICY IF EXISTS category_select ON "Category";
CREATE POLICY category_select ON "Category"
  FOR SELECT TO authenticated
  USING ("organizationId" = public.current_profile_org_id());

DROP POLICY IF EXISTS category_write ON "Category";
CREATE POLICY category_write ON "Category"
  FOR ALL TO authenticated
  USING (
    "organizationId" = public.current_profile_org_id()
    AND public.current_profile_role() = 'ADMIN'
  )
  WITH CHECK (
    "organizationId" = public.current_profile_org_id()
    AND public.current_profile_role() = 'ADMIN'
  );

DROP POLICY IF EXISTS item_select ON "Item";
CREATE POLICY item_select ON "Item"
  FOR SELECT TO authenticated
  USING ("organizationId" = public.current_profile_org_id());

DROP POLICY IF EXISTS item_write ON "Item";
CREATE POLICY item_write ON "Item"
  FOR ALL TO authenticated
  USING (
    "organizationId" = public.current_profile_org_id()
    AND public.current_profile_role() = 'ADMIN'
  )
  WITH CHECK (
    "organizationId" = public.current_profile_org_id()
    AND public.current_profile_role() = 'ADMIN'
  );

DROP POLICY IF EXISTS machine_select ON "Machine";
CREATE POLICY machine_select ON "Machine"
  FOR SELECT TO authenticated
  USING ("organizationId" = public.current_profile_org_id());

DROP POLICY IF EXISTS machine_write ON "Machine";
CREATE POLICY machine_write ON "Machine"
  FOR ALL TO authenticated
  USING (
    "organizationId" = public.current_profile_org_id()
    AND public.current_profile_role() = 'ADMIN'
  )
  WITH CHECK (
    "organizationId" = public.current_profile_org_id()
    AND public.current_profile_role() = 'ADMIN'
  );

-- Transaction: قراءة للكل، إدراج للمسجّلين في المؤسسة، بدون حذف/تعديل
DROP POLICY IF EXISTS transaction_select ON "Transaction";
CREATE POLICY transaction_select ON "Transaction"
  FOR SELECT TO authenticated
  USING ("organizationId" = public.current_profile_org_id());

DROP POLICY IF EXISTS transaction_insert ON "Transaction";
CREATE POLICY transaction_insert ON "Transaction"
  FOR INSERT TO authenticated
  WITH CHECK (
    "organizationId" = public.current_profile_org_id()
    AND "performedById" = auth.uid()
  );
