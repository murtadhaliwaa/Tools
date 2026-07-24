"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * شريط تقدم أعلى الصفحة عند النقر على روابط داخلية —
 * يعطي إحساساً فورياً بالاستجابة قبل وصول بيانات RSC.
 */
export function NavProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);
  const [width, setWidth] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  function stop() {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    setWidth(100);
    window.setTimeout(() => {
      setVisible(false);
      setWidth(0);
    }, 180);
  }

  function start() {
    setVisible(true);
    setWidth(12);
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(() => {
      setWidth((w) => (w >= 88 ? w : w + Math.random() * 10 + 2));
    }, 200);
  }

  useEffect(() => {
    stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      if (anchor.target === "_blank" || anchor.hasAttribute("download")) return;

      try {
        const url = new URL(href, window.location.origin);
        if (url.origin !== window.location.origin) return;
        if (
          url.pathname === window.location.pathname &&
          url.search === window.location.search
        ) {
          return;
        }
      } catch {
        return;
      }

      start();
    };

    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("click", onClick);
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5 bg-transparent"
      aria-hidden
    >
      <div
        className="h-full bg-primary transition-[width] duration-200 ease-out"
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
