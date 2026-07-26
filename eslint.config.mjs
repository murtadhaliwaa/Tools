import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // ملفات PWA المولَّدة تلقائياً
    "public/sw.js",
    "public/workbox-*.js",
    "public/sw.js.map",
    "public/workbox-*.js.map",
    "public/fallback-*.js",
  ]),
]);

export default eslintConfig;
