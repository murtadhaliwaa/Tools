import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString =
  process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL or DIRECT_URL is required to run the seed");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_DB_SEED !== "1") {
    throw new Error(
      "ممنوع تشغيل db:seed على الإنتاج بدون ALLOW_DB_SEED=1 (يحذف بيانات الكتالوج)",
    );
  }

  console.log("🌱 بدء تعبئة البيانات التجريبية...");

  // لا نحذف Profiles (مرتبطة بـ Auth) — نحدّث الكتالوج فقط
  const existingOrg = await prisma.organization.findFirst();

  const org =
    existingOrg ??
    (await prisma.organization.create({
      data: { name: "ورشة الشركة التجريبية", allowPublicSignup: false },
    }));

  // ربط أي profiles يتيمة بالمؤسسة
  await prisma.profile.updateMany({
    where: { organizationId: { not: org.id } },
    data: { organizationId: org.id },
  });

  await prisma.transaction.deleteMany({ where: { organizationId: org.id } });
  await prisma.item.deleteMany({ where: { organizationId: org.id } });
  await prisma.category.deleteMany({ where: { organizationId: org.id } });
  await prisma.machine.deleteMany({ where: { organizationId: org.id } });

  const [handTools, motors, spareParts, measuring] = await Promise.all([
    prisma.category.create({
      data: { organizationId: org.id, name: "عدة يدوية" },
    }),
    prisma.category.create({
      data: { organizationId: org.id, name: "محركات" },
    }),
    prisma.category.create({
      data: { organizationId: org.id, name: "قطع غيار" },
    }),
    prisma.category.create({
      data: { organizationId: org.id, name: "أجهزة قياس" },
    }),
  ]);

  await Promise.all([
    prisma.machine.create({
      data: {
        organizationId: org.id,
        name: "مكينة رقم 1",
        location: "القاعة أ",
      },
    }),
    prisma.machine.create({
      data: {
        organizationId: org.id,
        name: "مكينة رقم 2",
        location: "القاعة أ",
      },
    }),
    prisma.machine.create({
      data: {
        organizationId: org.id,
        name: "مكينة رقم 3",
        location: "القاعة ب",
      },
    }),
  ]);

  const itemsData = [
    { name: "سبانة 12", code: "HT-001", categoryId: handTools.id },
    { name: "مفك براغي مستوي", code: "HT-002", categoryId: handTools.id },
    { name: "زرادية", code: "HT-003", categoryId: handTools.id },
    { name: "مطرقة", code: "HT-004", categoryId: handTools.id },
    { name: "محرك 1 حصان", code: "MT-001", categoryId: motors.id },
    { name: "محرك 2 حصان", code: "MT-002", categoryId: motors.id },
    { name: "سير نقل", code: "SP-001", categoryId: spareParts.id },
    { name: "محمل (بيرنج)", code: "SP-002", categoryId: spareParts.id },
    { name: "قدم قنوية", code: "MS-001", categoryId: measuring.id },
    { name: "ميكرومتر", code: "MS-002", categoryId: measuring.id },
  ] as const;

  // نبحث عن أي profile موجود لإنشاء حركات تجريبية
  const performer = await prisma.profile.findFirst({
    where: { organizationId: org.id, isActive: true },
  });

  for (const data of itemsData) {
    const item = await prisma.item.create({
      data: {
        organizationId: org.id,
        name: data.name,
        code: data.code,
        categoryId: data.categoryId,
      },
    });

    if (performer) {
      await prisma.transaction.create({
        data: {
          organizationId: org.id,
          type: "ADDITION",
          itemId: item.id,
          performedById: performer.id,
          notes: "إضافة أولية عبر البيانات التجريبية",
        },
      });
    }
  }

  if (performer) {
    const [items, machines] = await Promise.all([
      prisma.item.findMany({
        where: { organizationId: org.id },
        orderBy: { code: "asc" },
      }),
      prisma.machine.findMany({
        where: { organizationId: org.id },
        orderBy: { name: "asc" },
      }),
    ]);

    if (items[0] && machines[0]) {
      await prisma.transaction.create({
        data: {
          organizationId: org.id,
          type: "ISSUE",
          itemId: items[0].id,
          machineId: machines[0].id,
          performedById: performer.id,
          notes: "صرف تجريبي للمكينة 1",
        },
      });
    }

    if (items[4] && machines[1]) {
      await prisma.transaction.create({
        data: {
          organizationId: org.id,
          type: "ISSUE",
          itemId: items[4].id,
          machineId: machines[1].id,
          performedById: performer.id,
        },
      });
    }

    if (items[9]) {
      await prisma.transaction.create({
        data: {
          organizationId: org.id,
          type: "SEND_TO_REPAIR",
          itemId: items[9].id,
          performedById: performer.id,
          notes: "خلل في القراءة",
        },
      });
    }

    if (items[3]) {
      await prisma.transaction.create({
        data: {
          organizationId: org.id,
          type: "SEND_TO_REPAIR",
          itemId: items[3].id,
          performedById: performer.id,
          notes: "كسر في المقبض",
        },
      });
      await prisma.transaction.create({
        data: {
          organizationId: org.id,
          type: "RETURN_FROM_REPAIR",
          itemId: items[3].id,
          performedById: performer.id,
          notes: "تم استبدال المقبض",
        },
      });
    }
  }

  console.log("✅ تم بنجاح:");
  console.log(`   المؤسسة: ${org.name} (${org.id})`);
  console.log(`   التصنيفات: 4 | المكائن: 3 | الأدوات: ${itemsData.length}`);
  if (!performer) {
    console.log(
      "⚠️  لا يوجد مستخدم بعد — سجّل حساباً من التطبيق ثم أعد تشغيل: npm run db:seed",
    );
  }
}

main()
  .catch((error) => {
    console.error("❌ فشل الـ seed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
