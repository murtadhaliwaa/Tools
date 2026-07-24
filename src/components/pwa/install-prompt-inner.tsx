"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/shared/brand-mark";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallPromptInner() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!visible || !deferred) return null;

  return (
    <div className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-md items-center justify-between gap-3 rounded-xl border bg-card p-3 shadow-lg md:inset-x-auto md:end-4 md:start-auto">
      <BrandMark size={40} />
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-medium">تثبيت التطبيق</p>
        <p className="text-xs text-muted-foreground">
          أضفه إلى الشاشة الرئيسية للوصول السريع
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button size="sm" variant="ghost" onClick={() => setVisible(false)}>
          لاحقاً
        </Button>
        <Button
          size="sm"
          onClick={async () => {
            await deferred.prompt();
            await deferred.userChoice;
            setVisible(false);
            setDeferred(null);
          }}
        >
          <Download className="size-4" />
          تثبيت
        </Button>
      </div>
    </div>
  );
}
