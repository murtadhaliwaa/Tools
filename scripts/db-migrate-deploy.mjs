import { spawnSync } from "node:child_process";

if (process.env.SKIP_DB_MIGRATE === "1") {
  console.info("[db] migrate deploy skipped (SKIP_DB_MIGRATE=1)");
  process.exit(0);
}

const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
  stdio: "inherit",
  shell: true,
  env: process.env,
});

process.exit(result.status ?? 1);
