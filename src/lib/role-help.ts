import { RoleLabel } from "@/types/domain";

/** نصوص مساعدة للأدوار — مصدر واحد للواجهة والدليل */
export const ROLE_PERMISSIONS = {
  ADMIN: {
    label: RoleLabel.ADMIN,
    can: [
      "كل صلاحيات أمين العدة",
      "التصنيفات والحسابات والإعدادات",
      "التقرير الشهري",
      "حذف أي حركة (تصحيح)",
    ],
    cannot: [] as string[],
  },
  KEEPER: {
    label: RoleLabel.KEEPER,
    can: [
      "تسجيل الحركات وسجل الحركات",
      "إدارة الأدوات والمكائن",
      "التقارير (عدا الشهري)",
    ],
    cannot: [
      "التصنيفات",
      "الحسابات",
      "الإعدادات",
      "التقرير الشهري",
    ],
  },
} as const;

export type RoleKey = keyof typeof ROLE_PERMISSIONS;
