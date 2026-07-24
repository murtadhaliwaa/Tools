import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("البريد الإلكتروني غير صالح"),
  password: z.string().min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل"),
});

export const signupSchema = z.object({
  fullName: z.string().min(2, "الاسم مطلوب"),
  email: z.string().email("البريد الإلكتروني غير صالح"),
  password: z
    .string()
    .min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل")
    .regex(/[A-Za-z]/, "كلمة المرور يجب أن تحتوي حرفاً")
    .regex(/[0-9]/, "كلمة المرور يجب أن تحتوي رقماً"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("البريد الإلكتروني غير صالح"),
});

export const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل")
    .regex(/[A-Za-z]/, "كلمة المرور يجب أن تحتوي حرفاً")
    .regex(/[0-9]/, "كلمة المرور يجب أن تحتوي رقماً"),
});

export const categorySchema = z.object({
  name: z.string().min(1, "اسم التصنيف مطلوب").max(100),
});

export const machineSchema = z.object({
  name: z.string().min(1, "اسم المكينة مطلوب").max(100),
  location: z.string().max(200).optional().nullable(),
});

export const itemSchema = z.object({
  name: z.string().min(1, "اسم الأداة مطلوب").max(150),
  code: z.string().max(50).optional().nullable(),
  categoryId: z.string().min(1, "التصنيف مطلوب"),
  notes: z.string().max(500).optional().nullable(),
});

export const organizationSettingsSchema = z.object({
  name: z.string().min(2, "اسم الورشة مطلوب").max(120),
  allowPublicSignup: z.boolean(),
});

export const createUserSchema = z.object({
  fullName: z.string().min(2, "الاسم مطلوب").max(120),
  email: z.string().email("البريد الإلكتروني غير صالح"),
  password: z
    .string()
    .min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل")
    .regex(/[A-Za-z]/, "كلمة المرور يجب أن تحتوي حرفاً")
    .regex(/[0-9]/, "كلمة المرور يجب أن تحتوي رقماً"),
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
    "ISSUE",
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
});

export const issueSchema = transactionBaseSchema.extend({
  type: z.literal("ISSUE"),
  itemId: z.string().min(1, "الأداة مطلوبة"),
  machineId: z.string().min(1, "المكينة مطلوبة"),
});

export const repairSchema = transactionBaseSchema.extend({
  type: z.enum(["SEND_TO_REPAIR", "RETURN_FROM_REPAIR"]),
  itemId: z.string().min(1, "الأداة مطلوبة"),
});

export const createTransactionSchema = z.discriminatedUnion("type", [
  additionSchema,
  issueSchema,
  repairSchema,
]);

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
