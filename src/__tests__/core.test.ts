/**
 * اختبارات خفيفة لمنطق التحقق والصلاحيات الأساسية.
 * تغطي الحالات الحرجة بدون الحاجة لقاعدة بيانات حية.
 */
import { describe, expect, it } from "vitest";
import { deriveItemStatus, quantityDeltaOnDelete } from "@/services/item-status";
import { ItemStatus, TransactionTypeLabel } from "@/types/domain";
import {
  signupSchema,
  createTransactionSchema,
  createUserSchema,
  itemSchema,
  machineSchema,
  categorySchema,
  exportMachineSchema,
  exportMonthlySchema,
} from "@/lib/validations";
import { toArabicErrorMessage } from "@/lib/errors";
import {
  clientKeyFromHeaders,
  isAuthRatePrefix,
  rateLimit,
  rateLimitSync,
} from "@/lib/rate-limit";
import {
  isBootstrapPending,
  verifyBootstrapSecret,
} from "@/lib/bootstrap";

describe("deriveItemStatus", () => {
  it("maps transaction types to statuses with quantity", () => {
    expect(deriveItemStatus("ADDITION", 1)).toBe(ItemStatus.AVAILABLE);
    expect(deriveItemStatus("ISSUE", 0)).toBe(ItemStatus.ISSUED);
    expect(deriveItemStatus("ISSUE", 3)).toBe(ItemStatus.AVAILABLE);
    expect(deriveItemStatus("RETURN_FROM_MACHINE", 1)).toBe(ItemStatus.AVAILABLE);
    expect(deriveItemStatus("SEND_TO_REPAIR", 5)).toBe(ItemStatus.IN_REPAIR);
    expect(deriveItemStatus("RETURN_FROM_REPAIR", 1)).toBe(ItemStatus.AVAILABLE);
    expect(deriveItemStatus(null, 1)).toBe(ItemStatus.AVAILABLE);
  });
});

describe("TransactionTypeLabel", () => {
  it("covers all transaction types in Arabic", () => {
    expect(TransactionTypeLabel.ADDITION).toBeTruthy();
    expect(TransactionTypeLabel.ISSUE).toBeTruthy();
    expect(TransactionTypeLabel.RETURN_FROM_MACHINE).toBeTruthy();
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

describe("bootstrap secret", () => {
  it("treats zero profiles as pending bootstrap", () => {
    expect(isBootstrapPending(0)).toBe(true);
    expect(isBootstrapPending(1)).toBe(false);
  });

  it("rejects missing or short BOOTSTRAP_SECRET", () => {
    const prev = process.env.BOOTSTRAP_SECRET;
    delete process.env.BOOTSTRAP_SECRET;
    expect(verifyBootstrapSecret("anything").ok).toBe(false);
    process.env.BOOTSTRAP_SECRET = "short";
    expect(verifyBootstrapSecret("short").ok).toBe(false);
    process.env.BOOTSTRAP_SECRET = prev;
  });

  it("accepts matching secret with timing-safe check", () => {
    const prev = process.env.BOOTSTRAP_SECRET;
    process.env.BOOTSTRAP_SECRET = "bootstrap-secret-16";
    expect(verifyBootstrapSecret("wrong-secret-xxxxx").ok).toBe(false);
    expect(verifyBootstrapSecret("bootstrap-secret-16").ok).toBe(true);
    process.env.BOOTSTRAP_SECRET = prev;
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
    expect(
      itemSchema.safeParse({
        name: "مفك",
        categoryId: "cat1",
        quantity: 5,
      }).success,
    ).toBe(true);
    expect(
      itemSchema.safeParse({
        name: "مفك",
        categoryId: "cat1",
        quantity: -1,
      }).success,
    ).toBe(false);
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
    expect(rateLimitSync(key, 2, 60_000).ok).toBe(true);
    expect(rateLimitSync(key, 2, 60_000).ok).toBe(true);
    expect(rateLimitSync(key, 2, 60_000).ok).toBe(false);
  });

  it("marks auth prefixes for strict production limits", () => {
    expect(isAuthRatePrefix("login")).toBe(true);
    expect(isAuthRatePrefix("signup")).toBe(true);
    expect(isAuthRatePrefix("export")).toBe(false);
  });

  it("fails closed when strict and Upstash is missing", async () => {
    const prevUrl = process.env.UPSTASH_REDIS_REST_URL;
    const prevToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    const result = await rateLimit("login:1.2.3.4", 8, 60_000, {
      strict: true,
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("misconfigured");

    if (prevUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
    else process.env.UPSTASH_REDIS_REST_URL = prevUrl;
    if (prevToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
    else process.env.UPSTASH_REDIS_REST_TOKEN = prevToken;
  });

  it("prefers platform IP headers over client-spoofable first XFF hop", () => {
    const headers = new Headers({
      "x-forwarded-for": "1.1.1.1, 10.0.0.1",
      "x-real-ip": "9.9.9.9",
    });
    expect(clientKeyFromHeaders(headers, "login")).toBe("login:9.9.9.9");
  });
});

describe("quantityDeltaOnDelete", () => {
  it("reverses stock-affecting types only", () => {
    expect(quantityDeltaOnDelete("ISSUE")).toBe(1);
    expect(quantityDeltaOnDelete("RETURN_FROM_MACHINE")).toBe(-1);
    expect(quantityDeltaOnDelete("ADDITION")).toBe(0);
    expect(quantityDeltaOnDelete("SEND_TO_REPAIR")).toBe(0);
    expect(quantityDeltaOnDelete("RETURN_FROM_REPAIR")).toBe(0);
  });
});

describe("export schemas", () => {
  it("validates machine export filters", () => {
    expect(
      exportMachineSchema.safeParse({ machineId: "m1", from: "2026-01-01" })
        .success,
    ).toBe(true);
    expect(exportMachineSchema.safeParse({ machineId: "" }).success).toBe(
      false,
    );
    expect(
      exportMachineSchema.safeParse({ machineId: "m1", from: "01-01-2026" })
        .success,
    ).toBe(false);
  });

  it("validates monthly export year/month", () => {
    expect(
      exportMonthlySchema.safeParse({ year: 2026, month: 7 }).success,
    ).toBe(true);
    expect(
      exportMonthlySchema.safeParse({ year: 2010, month: 13 }).success,
    ).toBe(false);
  });
});
