"use client";

import { useEffect, useState } from "react";
import { Download, Share } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/shared/brand-mark";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "pwa-install-dismissed";

function isIosSafari() {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua);
  const webkit = /WebKit/.test(ua);
  const isChrome = /CriOS|Chrome/.test(ua);
  return iOS && webkit && !isChrome;
}

export function InstallPromptInner() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [visible, setVisible] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY) === "1") return;

    const handler = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    if (isIosSafari() && !window.matchMedia("(display-mode: standalone)").matches) {
      const t = window.setTimeout(() => {
        setIosHint(true);
        setVisible(true);
      }, 0);
      return () => {
        window.clearTimeout(t);
        window.removeEventListener("beforeinstallprompt", handler);
      };
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  }

  if (!visible) return null;
  if (!deferred && !iosHint) return null;

  return (
    <div className="fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-50 mx-auto flex max-w-md items-center justify-between gap-3 rounded-xl border bg-card p-3 md:inset-x-auto md:end-4 md:start-auto">
      <BrandMark size={40} />
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-medium">تثبيت التطبيق</p>
        <p className="text-xs text-muted-foreground">
          {iosHint && !deferred
            ? "على iPhone: مشاركة ثم «إضافة إلى الشاشة الرئيسية»"
            : "أضفه إلى الشاشة الرئيسية للوصول السريع"}
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button size="sm" variant="ghost" onClick={dismiss}>
          لاحقاً
        </Button>
        {deferred ? (
          <Button
            size="sm"
            onClick={async () => {
              await deferred.prompt();
              await deferred.userChoice;
              dismiss();
              setDeferred(null);
            }}
          >
            <Download className="size-4" />
            تثبيت
          </Button>
        ) : (
          <Button size="sm" variant="outline" onClick={dismiss}>
            <Share className="size-4" />
            حسناً
          </Button>
        )}
      </div>
    </div>
  );
}
