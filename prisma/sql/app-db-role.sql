-- دور تشغيل Prisma غير فائق الصلاحيات (ليس مالكاً للجداول / ليس superuser)
--
-- لا نستخدم BYPASSRLS: على Supabase غالباً لا يملك دور الاتصال صلاحية تعيينه.
-- بدل ذلك: سياسات FORCE RLS تسمح لـ tool_tracker_app بكل الصفوف (انظر rls-policies.sql).
-- عزل المؤسسات لمسار التطبيق يبقى عبر requireUser + organizationId + org-integrity.
--
-- بعد التشغيل على Supabase (كمستخدم يملك CREATE ROLE):
--   ALTER ROLE tool_tracker_app PASSWORD 'كلمة-مرور-قوية';
-- ثم حدّث DATABASE_URL ليستخدم tool_tracker_app (أبقِ DIRECT_URL كـ postgres للترحيلات).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'tool_tracker_app') THEN
    CREATE ROLE tool_tracker_app
      NOSUPERUSER
      NOCREATEDB
      NOCREATEROLE
      NOINHERIT
      LOGIN;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO tool_tracker_app;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  "Organization",
  "Profile",
  "Category",
  "Item",
  "Machine",
  "Transaction"
TO tool_tracker_app;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT n.nspname, t.typname
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typtype = 'e'
  LOOP
    EXECUTE format('GRANT USAGE ON TYPE %I.%I TO tool_tracker_app', r.nspname, r.typname);
  END LOOP;
END
$$;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO tool_tracker_app;
