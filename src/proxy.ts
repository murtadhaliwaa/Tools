import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const PUBLIC_PATHS = [
  "/login",
  "/signup",
  "/forgot-password",
  "/auth/callback",
  "/auth/reset",
  "/auth/signout",
  "/offline",
];

/** مسارات للمدير فقط — تُحجب في Proxy + تُعاد حمايتها في الصفحات */
const ADMIN_ONLY_PREFIXES = [
  "/categories",
  "/users",
  "/reports/monthly",
  "/settings",
  "/help",
];

export async function proxy(request: NextRequest) {
  const { user, supabaseResponse, role } = await updateSession(request);
  const { pathname } = request.nextUrl;

  const isPublic = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  if (!user && !isPublic && pathname !== "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (!user && pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // إن وُجدت جلسة لكن الحساب غير مفعّل، اسمح بصفحة الدخول بدل ارتداد للداشبورد
  const pendingApproval =
    request.nextUrl.searchParams.get("error") === "pending";

  if (
    user &&
    (pathname === "/login" || pathname === "/signup") &&
    !pendingApproval
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  if (user && pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  const needsAdmin = ADMIN_ONLY_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  if (user && needsAdmin && role !== "ADMIN") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.searchParams.set("error", "forbidden");
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons|manifest.webmanifest|sw.js|workbox-.*|fallback-.*|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
