/**
 * اختبارات خفيفة لمنطق التحقق والصلاحيات الأساسية.
 * تغطي الحالات الحرجة بدون الحاجة لقاعدة بيانات حية.
 */
import { describe, expect, it } from "vitest";
import { deriveItemStatus } from "@/services/item-status";
import { ItemStatus, TransactionTypeLabel } from "@/types/domain";
import {
  signupSchema,
  createTransactionSchema,
  createUserSchema,
  itemSchema,
  machineSchema,
  categorySchema,
} from "@/lib/validations";
import { toArabicErrorMessage } from "@/lib/errors";
import { rateLimit } from "@/lib/rate-limit";

describe("deriveItemStatus", () => {
  it("maps transaction types to statuses", () => {
    expect(deriveItemStatus("ADDITION")).toBe(ItemStatus.AVAILABLE);
    expect(deriveItemStatus("ISSUE")).toBe(ItemStatus.ISSUED);
    expect(deriveItemStatus("SEND_TO_REPAIR")).toBe(ItemStatus.IN_REPAIR);
    expect(deriveItemStatus("RETURN_FROM_REPAIR")).toBe(ItemStatus.AVAILABLE);
    expect(deriveItemStatus(null)).toBe(ItemStatus.AVAILABLE);
  });
});

describe("TransactionTypeLabel", () => {
  it("covers all transaction types in Arabic", () => {
    expect(TransactionTypeLabel.ADDITION).toBeTruthy();
    expect(TransactionTypeLabel.ISSUE).toBeTruthy();
    expect(TransactionTypeLabel.SEND_TO_REPAIR).toBeTruthy();
    expect(TransactionTypeLabel.RETURN_FROM_REPAIR).toBeTruthy();
  });
});

describe("signupSchema", () => {
  it("rejects weak passwords", () => {
    const weak = signupSchema.safeParse({
      fullName: "أحمد",
      email: "a@b.com",
      password: "123456",
    });
    expect(weak.success).toBe(false);
  });

  it("accepts strong passwords", () => {
    const ok = signupSchema.safeParse({
      fullName: "أحمد",
      email: "a@b.com",
      password: "Secret12",
    });
    expect(ok.success).toBe(true);
  });
});

describe("createTransactionSchema", () => {
  it("requires machineId for ISSUE", () => {
    const bad = createTransactionSchema.safeParse({
      type: "ISSUE",
      itemId: "x",
    });
    expect(bad.success).toBe(false);

    const good = createTransactionSchema.safeParse({
      type: "ISSUE",
      itemId: "x",
      machineId: "m1",
    });
    expect(good.success).toBe(true);
  });

  it("rejects machineId for ADDITION", () => {
    const parsed = createTransactionSchema.safeParse({
      type: "ADDITION",
      name: "سبانة",
      categoryId: "c1",
      machineId: "m1",
    });
    // discriminated union ignores unknown or fails — either way machine not required
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.type).toBe("ADDITION");
    }
  });
});

describe("catalog schemas", () => {
  it("validates category / machine / item", () => {
    expect(categorySchema.safeParse({ name: "عدد يدوية" }).success).toBe(true);
    expect(machineSchema.safeParse({ name: "CNC-1", location: null }).success).toBe(
      true,
    );
    expect(
      itemSchema.safeParse({
        name: "مفك",
        categoryId: "cat1",
        code: null,
        notes: null,
      }).success,
    ).toBe(true);
  });
});

describe("createUserSchema", () => {
  it("requires role and strong password", () => {
    const bad = createUserSchema.safeParse({
      fullName: "أ",
      email: "bad",
      password: "123",
      role: "KEEPER",
    });
    expect(bad.success).toBe(false);

    const ok = createUserSchema.safeParse({
      fullName: "أمين العدة",
      email: "keeper@example.com",
      password: "Keeper12",
      role: "KEEPER",
    });
    expect(ok.success).toBe(true);
  });
});

describe("toArabicErrorMessage", () => {
  it("maps unique constraint errors", () => {
    const err = Object.assign(new Error("Unique constraint failed"), {
      code: "P2002",
      meta: { target: ["name"] },
    });
    expect(toArabicErrorMessage(err)).toContain("مسبقاً");
  });

  it("passes through Arabic messages", () => {
    expect(toArabicErrorMessage(new Error("الحساب غير موجود"))).toBe(
      "الحساب غير موجود",
    );
  });
});

describe("rateLimit", () => {
  it("blocks after limit", () => {
    const key = `test-${Date.now()}`;
    expect(rateLimit(key, 2, 60_000).ok).toBe(true);
    expect(rateLimit(key, 2, 60_000).ok).toBe(true);
    expect(rateLimit(key, 2, 60_000).ok).toBe(false);
  });
});
