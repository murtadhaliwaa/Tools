-- سياسات RLS لطبقة حماية إضافية على مستوى قاعدة البيانات (خصوصاً PostgREST)
--
-- مهم جداً:
-- 1) دور Prisma الموصى به: tool_tracker_app (انظر app-db-role.sql) — غير مالك/غير superuser.
--    تحت FORCE RLS له سياسات FOR ALL صريحة (بدون JWT) بسبب PgBouncer.
--    مصدر عزل المؤسسات للتطبيق = requireUser/requireRole + organizationId
--    + تريغرات org-integrity.sql.
-- 2) FORCE ROW LEVEL SECURITY يُخضع مالك الجدول للسياسات إن لم يكن BYPASSRLS/superuser.
-- 3) سياسات الكتابة أدناه لـ authenticated: أمين العدة في التطبيق يدير الأدوات عبر Server Actions؛
--    سياسات item_write/machine_write أضيق (ADMIN) لحماية PostgREST فقط.
-- 4) لا تعتمد على هذا الملف وحده لعزل المؤسسات عبر Prisma.

-- بيئة CI / Postgres محلي بدون Supabase: stub لـ auth.uid ودور authenticated
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'auth' AND p.proname = 'uid'
  ) THEN
    CREATE SCHEMA IF NOT EXISTS auth;
    EXECUTE $fn$
      CREATE FUNCTION auth.uid()
      RETURNS uuid
      LANGUAGE sql
      STABLE
      AS $body$
        SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
      $body$
    $fn$;
  END IF;
END
$$;

ALTER TABLE "Organization" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Profile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Category" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Item" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Machine" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Transaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RateLimitBucket" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "Organization" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Profile" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Category" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Item" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Machine" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Transaction" FORCE ROW LEVEL SECURITY;
ALTER TABLE "RateLimitBucket" FORCE ROW LEVEL SECURITY;

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

-- يمنع المستخدم من تعديل دوره أو تفعيله أو نقل مؤسسته عبر PostgREST
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     OR NEW."isActive" IS DISTINCT FROM OLD."isActive"
     OR NEW."organizationId" IS DISTINCT FROM OLD."organizationId"
     OR NEW.id IS DISTINCT FROM OLD.id THEN
    IF public.current_profile_role() IS DISTINCT FROM 'ADMIN'
       OR NEW."organizationId" IS DISTINCT FROM public.current_profile_org_id() THEN
      RAISE EXCEPTION 'غير مسموح بتعديل صلاحيات الملف الشخصي';
    END IF;
    IF NEW.id = auth.uid() AND (
      NEW.role IS DISTINCT FROM OLD.role
      OR NEW."isActive" IS DISTINCT FROM OLD."isActive"
      OR NEW."organizationId" IS DISTINCT FROM OLD."organizationId"
    ) THEN
      RAISE EXCEPTION 'غير مسموح بتعديل صلاحياتك عبر واجهة قاعدة البيانات';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_profile_privilege_escalation ON "Profile";
CREATE TRIGGER trg_prevent_profile_privilege_escalation
  BEFORE UPDATE ON "Profile"
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_privilege_escalation();

-- Organization
DROP POLICY IF EXISTS org_select ON "Organization";
CREATE POLICY org_select ON "Organization"
  FOR SELECT TO authenticated
  USING (id = public.current_profile_org_id());

-- Category / Item / Machine: قراءة نشطة لكل أعضاء المؤسسة، كتابة للمدير
DROP POLICY IF EXISTS category_select ON "Category";
CREATE POLICY category_select ON "Category"
  FOR SELECT TO authenticated
  USING (
    "organizationId" = public.current_profile_org_id()
    AND "deletedAt" IS NULL
  );

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
  USING (
    "organizationId" = public.current_profile_org_id()
    AND "deletedAt" IS NULL
  );

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
  USING (
    "organizationId" = public.current_profile_org_id()
    AND "deletedAt" IS NULL
  );

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

-- مسار Prisma (tool_tracker_app): تحت FORCE RLS بدون سياق JWT/PgBouncer
-- السماح الكامل لهذا الدور فقط — PostgREST يبقى مقيّداً بسياسات authenticated أعلاه
DROP POLICY IF EXISTS app_all_organization ON "Organization";
CREATE POLICY app_all_organization ON "Organization"
  FOR ALL TO tool_tracker_app
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS app_all_profile ON "Profile";
CREATE POLICY app_all_profile ON "Profile"
  FOR ALL TO tool_tracker_app
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS app_all_category ON "Category";
CREATE POLICY app_all_category ON "Category"
  FOR ALL TO tool_tracker_app
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS app_all_item ON "Item";
CREATE POLICY app_all_item ON "Item"
  FOR ALL TO tool_tracker_app
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS app_all_machine ON "Machine";
CREATE POLICY app_all_machine ON "Machine"
  FOR ALL TO tool_tracker_app
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS app_all_transaction ON "Transaction";
CREATE POLICY app_all_transaction ON "Transaction"
  FOR ALL TO tool_tracker_app
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS app_all_rate_limit_bucket ON "RateLimitBucket";
CREATE POLICY app_all_rate_limit_bucket ON "RateLimitBucket"
  FOR ALL TO tool_tracker_app
  USING (true)
  WITH CHECK (true);
