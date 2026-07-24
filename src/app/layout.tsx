import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import { ThemeProvider } from "@/components/theme/theme-provider";
import "./globals.css";

/** خط Cairo المتغيّر — ملف واحد بدل عدة أوزان تُحمَّل مسبقاً دون استخدام فوري */
const cairo = Cairo({
  subsets: ["arabic"],
  variable: "--font-cairo",
  display: "swap",
  adjustFontFallback: true,
});

export const metadata: Metadata = {
  title: "نظام تتبع الأدوات",
  description: "نظام تتبع عدة وأدوات الورشة — سجل حركات وحالة الأدوات",
  applicationName: "تتبع العدة",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "تتبع العدة",
  },
  icons: {
    icon: [
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/v2/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/v2/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/v2/apple-touch-icon.png", sizes: "180x180" }],
    shortcut: [{ url: "/icons/v2/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F5F3EE" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${cairo.variable} ${cairo.className} h-full`}
      suppressHydrationWarning
    >
      <body
        className="flex min-h-full flex-col font-sans antialiased"
        suppressHydrationWarning
      >
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
