import { z } from "zod";

/** كلمة مرور قوية مشتركة للتسجيل / الاستعادة / إنشاء مستخدم */
export const passwordSchema = z
  .string()
  .min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل")
  .regex(/[A-Za-z]/, "كلمة المرور يجب أن تحتوي حرفاً")
  .regex(/[0-9]/, "كلمة المرور يجب أن تحتوي رقماً");

export const loginSchema = z.object({
  email: z.string().email("البريد الإلكتروني غير صالح"),
  password: z.string().min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل"),
});

export const signupSchema = z.object({
  fullName: z.string().min(2, "الاسم مطلوب"),
  email: z.string().email("البريد الإلكتروني غير صالح"),
  password: passwordSchema,
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("البريد الإلكتروني غير صالح"),
});

export const resetPasswordSchema = z.object({
  password: passwordSchema,
});

export const categorySchema = z.object({
  name: z.string().min(1, "اسم التصنيف مطلوب").max(100),
});

export const machineSchema = z.object({
  name: z.string().min(1, "اسم المكينة مطلوب").max(100),
  location: z.string().max(200).optional().nullable(),
});

const quantityField = z.coerce
  .number({ error: "عدد المادة غير صالح" })
  .int("عدد المادة يجب أن يكون عدداً صحيحاً")
  .min(0, "عدد المادة لا يمكن أن يكون سالباً")
  .max(1_000_000, "عدد المادة كبير جداً");

const minQuantityField = z.coerce
  .number({ error: "الحد الأدنى غير صالح" })
  .int("الحد الأدنى يجب أن يكون عدداً صحيحاً")
  .min(0, "الحد الأدنى لا يمكن أن يكون سالباً")
  .max(1_000_000, "الحد الأدنى كبير جداً")
  .default(0);

export const itemSchema = z.object({
  name: z.string().min(1, "اسم الأداة مطلوب").max(150),
  code: z.string().max(50).optional().nullable(),
  categoryId: z.string().min(1, "التصنيف مطلوب"),
  quantity: quantityField.default(1),
  /** 0 = بلا تنبيه نفاد */
  minQuantity: minQuantityField,
  notes: z.string().max(500).optional().nullable(),
});

export const organizationSettingsSchema = z.object({
  name: z.string().min(2, "اسم الورشة مطلوب").max(120),
  allowPublicSignup: z.boolean(),
});

export const createUserSchema = z.object({
  fullName: z.string().min(2, "الاسم مطلوب").max(120),
  email: z.string().email("البريد الإلكتروني غير صالح"),
  password: passwordSchema,
  role: z.enum(["ADMIN", "KEEPER"]),
});

export const updateUserSchema = z.object({
  fullName: z.string().min(2, "الاسم مطلوب").max(120),
  role: z.enum(["ADMIN", "KEEPER"]),
});

export const updateTransactionNotesSchema = z.object({
  notes: z.string().max(500).optional().nullable(),
});

export const transactionBaseSchema = z.object({
  type: z.enum([
    "ADDITION",
    "STOCK_ADDITION",
    "ISSUE",
    "RETURN_FROM_MACHINE",
    "SEND_TO_REPAIR",
    "RETURN_FROM_REPAIR",
  ]),
  notes: z.string().max(500).optional().nullable(),
});

export const additionSchema = transactionBaseSchema.extend({
  type: z.literal("ADDITION"),
  name: z.string().min(1, "اسم الأداة مطلوب"),
  categoryId: z.string().min(1, "التصنيف مطلوب"),
  code: z.string().max(50).optional().nullable(),
  quantity: quantityField.default(1),
  minQuantity: minQuantityField,
});

const issueQuantityField = z.coerce
  .number({ error: "العدد غير صالح" })
  .int("العدد يجب أن يكون عدداً صحيحاً")
  .min(1, "العدد يجب أن يكون 1 على الأقل")
  .max(1_000_000, "العدد كبير جداً");

export const issueSchema = transactionBaseSchema.extend({
  type: z.literal("ISSUE"),
  itemId: z.string().min(1, "الأداة مطلوبة"),
  machineId: z.string().min(1, "المكينة مطلوبة"),
  quantity: issueQuantityField.default(1),
});

export const stockAdditionSchema = transactionBaseSchema.extend({
  type: z.literal("STOCK_ADDITION"),
  itemId: z.string().min(1, "الأداة مطلوبة"),
  quantity: issueQuantityField.default(1),
});

export const returnFromMachineSchema = transactionBaseSchema.extend({
  type: z.literal("RETURN_FROM_MACHINE"),
  itemId: z.string().min(1, "الأداة مطلوبة"),
});

export const repairSchema = transactionBaseSchema.extend({
  type: z.enum(["SEND_TO_REPAIR", "RETURN_FROM_REPAIR"]),
  itemId: z.string().min(1, "الأداة مطلوبة"),
});

export const createTransactionSchema = z.discriminatedUnion("type", [
  additionSchema,
  stockAdditionSchema,
  issueSchema,
  returnFromMachineSchema,
  repairSchema,
]);

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;

const optionalDateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "تاريخ غير صالح")
  .optional();

export const exportMachineSchema = z.object({
  machineId: z.string().min(1, "المكينة مطلوبة"),
  from: optionalDateString,
  to: optionalDateString,
});

export const exportItemSchema = z.object({
  itemId: z.string().min(1, "المادة مطلوبة"),
});

export const exportMaterialSchema = z.object({
  itemId: z.string().min(1, "المادة مطلوبة"),
  from: optionalDateString,
  to: optionalDateString,
});

export const exportMonthlySchema = z.object({
  year: z.coerce.number().int().min(2020).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});

export const exportInventorySchema = z.object({
  categoryId: z.string().min(1).optional(),
  status: z.enum(["AVAILABLE", "ISSUED", "IN_REPAIR"]).optional(),
  stock: z.literal("low").optional(),
  q: z.string().max(100).optional(),
});

export const exportIssuesSchema = z.object({
  from: optionalDateString,
  to: optionalDateString,
  machineId: z.string().min(1).optional(),
  itemId: z.string().min(1).optional(),
});
