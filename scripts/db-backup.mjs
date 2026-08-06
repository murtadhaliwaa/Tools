/**
 * نسخة احتياطية JSON للجداول الأساسية عبر pg (بدون الحاجة لـ pg_dump).
 * المخرجات في backups/ (مستثناة من Git).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { config } from "dotenv";
import pg from "pg";

config({ path: ".env.local" });
config();

const url = process.env.DIRECT_URL?.trim() || process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("DIRECT_URL أو DATABASE_URL مطلوب للنسخ الاحتياطي");
  process.exit(1);
}

const TABLES = [
  "Organization",
  "Profile",
  "Category",
  "Item",
  "Machine",
  "Transaction",
];

const outDir = join(process.cwd(), "backups");
mkdirSync(outDir, { recursive: true });

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const outFile = join(outDir, `backup-${stamp}.json`);

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });

async function main() {
  await client.connect();
  const payload = {
    createdAt: new Date().toISOString(),
    tables: {},
  };

  for (const table of TABLES) {
    const res = await client.query(`SELECT * FROM "${table}"`);
    payload.tables[table] = res.rows;
    console.info(`[backup] ${table}: ${res.rowCount} rows`);
  }

  writeFileSync(outFile, JSON.stringify(payload, null, 2), "utf8");
  console.info(`[backup] wrote ${outFile}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await client.end().catch(() => undefined);
  });
