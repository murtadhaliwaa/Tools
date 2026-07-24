import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // للـ migrate يُفضَّل DIRECT_URL (اتصال مباشر بدون PgBouncer)
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
  },
});
