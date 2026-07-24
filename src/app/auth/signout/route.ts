import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * مسار يمسح جلسة Supabase بشكل موثوق على الـ Response
 * (من Server Components قد يفشل set للكوكيز قبل redirect).
 */
export async function GET(request: Request) {
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
