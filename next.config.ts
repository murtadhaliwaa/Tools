import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  fallbacks: {
    document: "/offline",
  },
  workboxOptions: {
    disableDevLogs: true,
  },
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  images: {
    formats: ["image/avif", "image/webp"],
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns", "recharts"],
  },
  // يقلل تحذير PackFileCacheStrategy عند تخزين نصوص كبيرة (PWA/workbox)
  webpack: (config, { dev }) => {
    if (!dev && config.cache && typeof config.cache === "object") {
      config.cache = {
        ...config.cache,
        compression: "gzip",
      };
    }
    return config;
  },
  headers: async () => [
    {
      source: "/icons/:path*",
      headers: [
        {
          key: "Cache-Control",
          value: "public, max-age=3600, must-revalidate",
        },
      ],
    },
    {
      source: "/favicon.ico",
      headers: [
        {
          key: "Cache-Control",
          value: "public, max-age=3600, must-revalidate",
        },
      ],
    },
    {
      source: "/manifest.webmanifest",
      headers: [
        {
          key: "Cache-Control",
          value: "no-cache, must-revalidate",
        },
      ],
    },
  ],
};

export default withPWA(nextConfig);
