/**
 * وكيل عكسي: الزائر → Cloudflare (متاح) → Vercel (قد يكون محجوباً من بعض الشبكات)
 * ORIGIN = رابط التطبيق على Vercel
 */
const ORIGIN = "https://tools-zeta-nine-54.vercel.app";

export default {
  async fetch(request, _env, _ctx) {
    const incoming = new URL(request.url);
    const target = new URL(incoming.pathname + incoming.search, ORIGIN);

    const headers = new Headers(request.headers);
    headers.set("Host", new URL(ORIGIN).host);
    headers.delete("cf-connecting-ip");
    headers.delete("cf-ipcountry");
    headers.delete("cf-ray");
    headers.delete("cf-visitor");

    const init = {
      method: request.method,
      headers,
      redirect: "manual",
    };

    if (request.method !== "GET" && request.method !== "HEAD") {
      init.body = request.body;
      // @ts-expect-error duplex for streaming bodies
      init.duplex = "half";
    }

    let upstream;
    try {
      upstream = await fetch(target, init);
    } catch {
      return new Response(
        "<!doctype html><html lang='ar' dir='rtl'><body style='font-family:sans-serif;padding:2rem;text-align:center'><h1>تعذّر الوصول للتطبيق</h1><p>الخادم الأصلي غير متاح حالياً. حاول لاحقاً.</p></body></html>",
        { status: 502, headers: { "content-type": "text/html; charset=utf-8" } },
      );
    }

    const outHeaders = new Headers(upstream.headers);
    // منع SW القديم من Vercel من التحكم بالمجال الجديد بشكل خاطئ
    outHeaders.delete("content-security-policy");

    // إعادة كتابة Location المطلقة إن وُجدت
    const location = outHeaders.get("location");
    if (location) {
      try {
        const loc = new URL(location, ORIGIN);
        if (loc.origin === new URL(ORIGIN).origin) {
          outHeaders.set(
            "location",
            incoming.origin + loc.pathname + loc.search + loc.hash,
          );
        }
      } catch {
        /* ignore */
      }
    }

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: outHeaders,
    });
  },
};
