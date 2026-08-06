import { createClient } from "@supabase/supabase-js";
import { getPublicEnv } from "@/lib/env";

/** عميل Admin — يتطلب SUPABASE_SERVICE_ROLE_KEY (خادم فقط) */
export function createAdminClient() {
  const { supabaseUrl } = getPublicEnv();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!key) {
    throw new Error(
      "إنشاء الحسابات يتطلب SUPABASE_SERVICE_ROLE_KEY في متغيرات البيئة",
    );
  }
  return createClient(supabaseUrl, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
