"use client";

import dynamic from "next/dynamic";

const InstallPromptInner = dynamic(
  () =>
    import("@/components/pwa/install-prompt-inner").then(
      (m) => m.InstallPromptInner,
    ),
  { ssr: false },
);

/** يُحمَّل كسولاً — لا يؤثر على First Paint */
export function InstallPrompt() {
  return <InstallPromptInner />;
}
