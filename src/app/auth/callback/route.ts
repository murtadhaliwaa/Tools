import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { clearRoleCookie, ensureProfile, syncRoleCookie } from "@/lib/auth";

function safeNextPath(raw: string | null): string {
  if (!raw) return "/dashboard";
  if (!raw.startsWith("/")) return "/dashboard";
  if (raw.startsWith("//") || raw.startsWith("/\\")) return "/dashboard";
  if (raw.includes("://")) return "/dashboard";
  return raw;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  const fullName =
    (data.user.user_metadata?.full_name as string | undefined) ??
    data.user.email?.split("@")[0] ??
    "مستخدم";
  const profile = await ensureProfile(data.user.id, fullName);

  if (!profile.isActive) {
    await supabase.auth.signOut();
    await clearRoleCookie();
    return NextResponse.redirect(`${origin}/login?error=pending`);
  }

  await syncRoleCookie(profile.role);

  return NextResponse.redirect(`${origin}${next}`);
}
