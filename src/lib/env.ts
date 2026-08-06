import { z } from "zod";

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("NEXT_PUBLIC_SUPABASE_URL غير صالح"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY مطلوب"),
});

const serverSchema = publicSchema.extend({
  DATABASE_URL: z.string().min(1, "DATABASE_URL مطلوب"),
});

export type PublicEnv = {
  supabaseUrl: string;
  supabaseAnonKey: string;
};

let cachedPublic: PublicEnv | null = null;

function readPublicEnv(): PublicEnv {
  const parsed = publicSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(`متغيرات البيئة العامة غير مكتملة: ${details}`);
  }
  return {
    supabaseUrl: parsed.data.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: parsed.data.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };
}

/** للعميل والخادم — مفاتيح Supabase العامة فقط */
export function getPublicEnv(): PublicEnv {
  if (process.env.NODE_ENV === "test") {
    return readPublicEnv();
  }
  if (cachedPublic) return cachedPublic;
  cachedPublic = readPublicEnv();
  return cachedPublic;
}

/** تحقق كامل عند إقلاع السيرفر (instrumentation) */
export function assertServerEnv() {
  const parsed = serverSchema.safeParse({
    DATABASE_URL: process.env.DATABASE_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(`متغيرات البيئة غير مكتملة: ${details}`);
  }

  const isProd = process.env.NODE_ENV === "production";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (isProd && !siteUrl) {
    throw new Error("NEXT_PUBLIC_SITE_URL مطلوب في الإنتاج");
  }
  if (siteUrl) {
    const urlOk = z.string().url().safeParse(siteUrl);
    if (!urlOk.success) {
      throw new Error("NEXT_PUBLIC_SITE_URL غير صالح");
    }
  }

  cachedPublic = {
    supabaseUrl: parsed.data.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: parsed.data.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };

  return parsed.data;
}
