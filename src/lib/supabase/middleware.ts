import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { USER_HEADER } from "@/lib/auth-headers";

export type AppRole = "ADMIN" | "KEEPER" | null;

type CookieToSet = {
  name: string;
  value: string;
  options?: Parameters<NextResponse["cookies"]["set"]>[2];
};

function applyUserHeaders(headers: Headers, user: User | null) {
  headers.delete(USER_HEADER.id);
  headers.delete(USER_HEADER.email);
  headers.delete(USER_HEADER.name);
  if (!user) return;
  headers.set(USER_HEADER.id, user.id);
  if (user.email) headers.set(USER_HEADER.email, user.email);
  const fullName = user.user_metadata?.full_name;
  if (typeof fullName === "string" && fullName) {
    headers.set(USER_HEADER.name, encodeURIComponent(fullName));
  }
}

function nextWithUser(
  request: NextRequest,
  pathname: string,
  user: User | null,
  cookiesToSet: CookieToSet[] = [],
) {
  const requestHeaders = new Headers(request.headers);
  applyUserHeaders(requestHeaders, user);
  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.headers.set("x-pathname", pathname);
  cookiesToSet.forEach(({ name, value, options }) =>
    response.cookies.set(name, value, options),
  );
  return response;
}

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  let user: User | null = null;
  let cookiesToSet: CookieToSet[] = [];
  let supabaseResponse = nextWithUser(request, pathname, null);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(nextCookies) {
          cookiesToSet = nextCookies;
          nextCookies.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = nextWithUser(
            request,
            pathname,
            user,
            cookiesToSet,
          );
        },
      },
    },
  );

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  user = authUser;

  supabaseResponse = nextWithUser(request, pathname, user, cookiesToSet);

  const metaRole = user?.app_metadata?.role ?? user?.user_metadata?.role;
  const role: AppRole =
    metaRole === "ADMIN" || metaRole === "KEEPER" ? metaRole : null;

  const cookieRole = request.cookies.get("app_role")?.value;
  const effectiveRole: AppRole =
    role ??
    (cookieRole === "ADMIN" || cookieRole === "KEEPER" ? cookieRole : null);

  return {
    user,
    supabaseResponse,
    role: effectiveRole,
  };
}
