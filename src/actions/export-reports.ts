"use server";

import { AuthError, ForbiddenError, requireUser, requireRole } from "@/lib/auth";
import { toArabicErrorMessage } from "@/lib/errors";
import { formatDateTime } from "@/lib/format";
import type { ExportRow } from "@/lib/export-report";
import { parseDayEnd } from "@/lib/search-params";
import {
  exportItemSchema,
  exportMachineSchema,
  exportMaterialSchema,
  exportMonthlySchema,
} from "@/lib/validations";
import {
  EXPORT_ROW_LIMIT,
  TIMELINE_EXPORT_LIMIT,
  getItemTimeline,
  getMachineReport,
  getMaterialReport,
  getMonthlySummary,
  getRepairStatusReport,
} from "@/services/reports";
import { TransactionTypeLabel } from "@/types/domain";
import { guardRate } from "@/actions/shared";

export type ExportResult = {
  rows: ExportRow[];
  truncated?: boolean;
  limit?: number;
  total?: number;
  error?: string;
};

function exportError(error: unknown): ExportResult {
  if (error instanceof AuthError || error instanceof ForbiddenError) {
    return { rows: [], error: error.message };
  }
  return { rows: [], error: toArabicErrorMessage(error) };
}

async function requireExportRate(): Promise<string | null> {
  const limited = await guardRate("export", 20);
  if (limited) return limited.message ?? "محاولات كثيرة";
  return null;
}

export async function loadMachineExportRows(
  input: unknown,
): Promise<ExportResult> {
  try {
    const rateError = await requireExportRate();
    if (rateError) return { rows: [], error: rateError };
    const { profile } = await requireUser();
    const parsed = exportMachineSchema.safeParse(input);
    if (!parsed.success) {
      return { rows: [], error: "تحقق من فلاتر التصدير" };
    }
    const report = await getMachineReport({
      organizationId: profile.organizationId,
      machineId: parsed.data.machineId,
      from: parsed.data.from ? new Date(parsed.data.from) : undefined,
      to: parseDayEnd(parsed.data.to),
      page: 1,
      pageSize: EXPORT_ROW_LIMIT,
    });
    return {
      rows: report.rows.map((r) => [
        r.item.name,
        r.item.code,
        formatDateTime(r.createdAt),
        r.performedBy.fullName,
        r.notes,
      ]),
      truncated: report.truncated,
      limit: report.limit,
      total: report.total,
    };
  } catch (error) {
    return exportError(error);
  }
}

export async function loadItemTimelineExportRows(
  input: unknown,
): Promise<ExportResult> {
  try {
    const rateError = await requireExportRate();
    if (rateError) return { rows: [], error: rateError };
    const { profile } = await requireUser();
    const parsed = exportItemSchema.safeParse(input);
    if (!parsed.success) {
      return { rows: [], error: "تحقق من فلاتر التصدير" };
    }
    const timeline = await getItemTimeline({
      organizationId: profile.organizationId,
      itemId: parsed.data.itemId,
      page: 1,
      pageSize: TIMELINE_EXPORT_LIMIT,
    });
    return {
      rows: timeline.rows.map((t) => [
        TransactionTypeLabel[t.type],
        t.machine?.name,
        t.performedBy.fullName,
        formatDateTime(t.createdAt),
        t.notes,
      ]),
      truncated: timeline.truncated,
      limit: timeline.limit,
      total: timeline.total,
    };
  } catch (error) {
    return exportError(error);
  }
}

export async function loadMaterialExportRows(
  input: unknown,
): Promise<ExportResult> {
  try {
    const rateError = await requireExportRate();
    if (rateError) return { rows: [], error: rateError };
    const { profile } = await requireUser();
    const parsed = exportMaterialSchema.safeParse(input);
    if (!parsed.success) {
      return { rows: [], error: "تحقق من فلاتر التصدير" };
    }
    const report = await getMaterialReport({
      organizationId: profile.organizationId,
      itemId: parsed.data.itemId,
      from: parsed.data.from ? new Date(parsed.data.from) : undefined,
      to: parseDayEnd(parsed.data.to),
      page: 1,
      pageSize: EXPORT_ROW_LIMIT,
    });
    if (!report) return { rows: [], error: "الأداة غير موجودة" };
    return {
      rows: report.rows.map((r) => [
        TransactionTypeLabel[r.type],
        r.machine?.name,
        r.performedBy.fullName,
        formatDateTime(r.createdAt),
        r.notes,
      ]),
      truncated: report.truncated,
      limit: report.limit,
      total: report.total,
    };
  } catch (error) {
    return exportError(error);
  }
}

export async function loadRepairStatusExportRows(): Promise<ExportResult> {
  try {
    const rateError = await requireExportRate();
    if (rateError) return { rows: [], error: rateError };
    const { profile } = await requireUser();
    const report = await getRepairStatusReport(profile.organizationId, {
      page: 1,
      pageSize: EXPORT_ROW_LIMIT,
    });
    return {
      rows: report.rows.map((r) => [
        r.name,
        r.code,
        r.categoryName,
        r.since ? formatDateTime(r.since) : "",
      ]),
      truncated: report.total > report.rows.length,
      limit: report.pageSize,
      total: report.total,
    };
  } catch (error) {
    return exportError(error);
  }
}

export async function loadMonthlyExportRows(
  input: unknown,
): Promise<ExportResult> {
  try {
    const rateError = await requireExportRate();
    if (rateError) return { rows: [], error: rateError };
    const { profile } = await requireRole(["ADMIN"]);
    const parsed = exportMonthlySchema.safeParse(input);
    if (!parsed.success) {
      return { rows: [], error: "تحقق من فلاتر التصدير" };
    }
    const summary = await getMonthlySummary({
      organizationId: profile.organizationId,
      year: parsed.data.year,
      month: parsed.data.month,
    });
    return {
      rows: [
        ...Object.entries(summary.byType).map(([type, count]) => [
          "النوع",
          TransactionTypeLabel[type as keyof typeof TransactionTypeLabel] ??
            type,
          count,
        ]),
        ...Object.entries(summary.byCategory).map(([name, count]) => [
          "التصنيف",
          name,
          count,
        ]),
      ],
    };
  } catch (error) {
    return exportError(error);
  }
}
