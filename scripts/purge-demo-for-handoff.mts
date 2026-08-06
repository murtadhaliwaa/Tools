/**
 * تصفية بيانات التسليم: يحذف الكتالوج والحركات، ويبقي المؤسسة والحسابات الثلاثة.
 * تشغيل: npx tsx scripts/purge-demo-for-handoff.mts
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { PrismaClient } from "../src/generated/prisma/client.ts";
import { PrismaPg } from "@prisma/adapter-pg";

const KEEP_NAMES = new Set(["مرتضى", "Ahmed Thamer", "امجد"]);

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL!,
  }),
});

async function main() {
  const profiles = await prisma.profile.findMany({
    select: { id: true, fullName: true, role: true, isActive: true },
  });

  const normalized = profiles.map((p) => ({
    ...p,
    fullNameTrim: p.fullName.trim(),
  }));

  const keep = normalized.filter((p) => KEEP_NAMES.has(p.fullNameTrim));
  const drop = normalized.filter((p) => !KEEP_NAMES.has(p.fullNameTrim));

  if (keep.length !== 3) {
    console.error(
      "لم يُعثر على الحسابات الثلاثة المتوقعة بالأسماء:",
      [...KEEP_NAMES],
    );
    console.error(
      "الموجود:",
      normalized.map((p) => JSON.stringify(p.fullName)),
    );
    process.exit(1);
  }

  // توحيد الأسماء (إزالة مسافات زائدة)
  for (const p of keep) {
    if (p.fullName !== p.fullNameTrim) {
      await prisma.profile.update({
        where: { id: p.id },
        data: { fullName: p.fullNameTrim },
      });
    }
  }

  const tx = await prisma.transaction.deleteMany({});
  const items = await prisma.item.deleteMany({});
  const machines = await prisma.machine.deleteMany({});
  const categories = await prisma.category.deleteMany({});
  const buckets = await prisma.rateLimitBucket.deleteMany({});

  let removedProfiles = 0;
  if (drop.length > 0) {
    const res = await prisma.profile.deleteMany({
      where: { id: { in: drop.map((p) => p.id) } },
    });
    removedProfiles = res.count;
  }

  await prisma.organization.updateMany({
    data: {
      allowPublicSignup: false,
      name: "ورشة الشركة",
    },
  });

  const remaining = await prisma.profile.findMany({
    select: { fullName: true, role: true, isActive: true },
    orderBy: { fullName: "asc" },
  });

  console.log(
    JSON.stringify(
      {
        deleted: {
          transactions: tx.count,
          items: items.count,
          machines: machines.count,
          categories: categories.count,
          rateLimitBuckets: buckets.count,
          extraProfiles: removedProfiles,
        },
        keptProfiles: remaining,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
