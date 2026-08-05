import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * يسمح بنفس الأصل فقط — يمنع CSRF خروج قسري من موقع خارجي.
 * GET يُستخدم لتنظيف الجلسة من الـ layout؛ POST للخروج الصريح إن لزم.
 */
function isTrustedSignOutRequest(request: Request): boolean {
  const url = new URL(request.url);
  const site = request.headers.get("sec-fetch-site");
  if (site === "cross-site") return false;

  const origin = request.headers.get("origin");
  if (origin) return origin === url.origin;

  const referer = request.headers.get("referer");
  if (referer) {
    try {
      return new URL(referer).origin === url.origin;
    } catch {
      return false;
    }
  }

  // تنقّل مباشر من التطبيق غالباً same-origin / none بدون Origin
  return site === "same-origin" || site === "same-site" || site === "none" || !site;
}

async function clearSessionAndRedirect(request: Request) {
  const url = new URL(request.url);
  const reason = url.searchParams.get("error") ?? "";
  const login = new URL("/login", url.origin);
  if (reason) login.searchParams.set("error", reason);

  const response = NextResponse.redirect(login);
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  await supabase.auth.signOut();
  response.cookies.set("app_role", "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });

  return response;
}

/** تنظيف جلسة منتهية / حساب معلّق — من داخل التطبيق فقط */
export async function GET(request: Request) {
  if (!isTrustedSignOutRequest(request)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return clearSessionAndRedirect(request);
}

/** خروج صريح بنفس الأصل */
export async function POST(request: Request) {
  if (!isTrustedSignOutRequest(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return clearSessionAndRedirect(request);
}
