"use client";

import { useEffect, useState } from "react";
import { BrandMark } from "@/components/shared/brand-mark";
import { Button } from "@/components/ui/button";

async function clearAppCaches() {
  if ("serviceWorker" in navigator) {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((r) => r.unregister()));
  }
  if ("caches" in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
  }
}

export default function OfflinePage() {
  const [online, setOnline] = useState(true);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  async function retry() {
    window.location.assign("/");
  }

  async function resetAndRetry() {
    setClearing(true);
    try {
      await clearAppCaches();
    } finally {
      window.location.assign("/");
    }
  }

  return (
    <main className="flex min-h-full flex-1 items-center justify-center p-6 text-center">
      <div className="max-w-md space-y-4">
        <div className="flex justify-center">
          <BrandMark size={56} />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-bold">
            {online ? "تعذّر الوصول للخادم" : "أنت غير متصل"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {online
              ? "الجهاز متصل بالإنترنت، لكن خادم الاستضافة (Vercel) غير متاح من شبكتك حالياً. جرّب نقطة اتصال الجوال أو VPN، أو امسح كاش التطبيق أدناه."
              : "تحقق من اتصال الإنترنت ثم أعد المحاولة."}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button type="button" onClick={() => void retry()}>
            إعادة المحاولة
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={clearing}
            onClick={() => void resetAndRetry()}
          >
            {clearing ? "جاري المسح..." : "مسح الكاش وإعادة المحاولة"}
          </Button>
        </div>
      </div>
    </main>
  );
}
