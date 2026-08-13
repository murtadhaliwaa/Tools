-- إصلاحات Supabase Security Advisor
-- التشغيل عبر: npm run db:sql (بعد rls-policies.sql)

-- ─── 1) RLS على جدول هجرات Prisma (ليس بيانات التطبيق) ───
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = '_prisma_migrations'
  ) THEN
    ALTER TABLE public."_prisma_migrations" ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public."_prisma_migrations" FORCE ROW LEVEL SECURITY;
    REVOKE ALL ON TABLE public."_prisma_migrations" FROM PUBLIC;
    REVOKE ALL ON TABLE public."_prisma_migrations" FROM anon;
    REVOKE ALL ON TABLE public."_prisma_migrations" FROM authenticated;
  END IF;
END
$$;

-- ─── 2) تقييد EXECUTE على دوال SECURITY DEFINER (RLS helpers) ───
-- authenticated يحتاجها لسياسات RLS عبر PostgREST فقط
REVOKE ALL ON FUNCTION public.current_profile_org_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_profile_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_profile_org_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_profile_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_profile_org_id() TO service_role;
GRANT EXECUTE ON FUNCTION public.current_profile_role() TO service_role;

-- ─── 3) دوال التريغر: لا استدعاء مباشر من anon/authenticated ───
REVOKE ALL ON FUNCTION public.prevent_profile_privilege_escalation() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.prevent_profile_privilege_escalation() FROM anon;
REVOKE ALL ON FUNCTION public.prevent_profile_privilege_escalation() FROM authenticated;

REVOKE ALL ON FUNCTION public.enforce_item_same_org() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enforce_item_same_org() FROM anon;
REVOKE ALL ON FUNCTION public.enforce_item_same_org() FROM authenticated;

REVOKE ALL ON FUNCTION public.enforce_transaction_same_org() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enforce_transaction_same_org() FROM anon;
REVOKE ALL ON FUNCTION public.enforce_transaction_same_org() FROM authenticated;

-- Prisma (tool_tracker_app) يحتاج EXECUTE لإطلاق التريغرات
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'tool_tracker_app') THEN
    GRANT EXECUTE ON FUNCTION public.enforce_item_same_org() TO tool_tracker_app;
    GRANT EXECUTE ON FUNCTION public.enforce_transaction_same_org() TO tool_tracker_app;
    GRANT EXECUTE ON FUNCTION public.prevent_profile_privilege_escalation() TO tool_tracker_app;
  END IF;
END
$$;
