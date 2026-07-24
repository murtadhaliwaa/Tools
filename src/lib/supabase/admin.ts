import { createClient } from "@supabase/supabase-js";

/** عميل Admin — يتطلب SUPABASE_SERVICE_ROLE_KEY (خادم فقط) */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "إنشاء الحسابات يتطلب SUPABASE_SERVICE_ROLE_KEY في متغيرات البيئة",
    );
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
