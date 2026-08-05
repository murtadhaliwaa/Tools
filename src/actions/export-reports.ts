"use server";

import { requireUser, requireRole } from "@/lib/auth";
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
  getItemTimeline,
  getMachineReport,
  getMaterialReport,
  getMonthlySummary,
  getRepairStatusReport,
} from "@/services/reports";
import { TransactionTypeLabel } from "@/types/domain";
import { guardRate } from "@/actions/shared";

async function requireExportRate() {
  const limited = await guardRate("export", 20);
  if (limited) {
    throw new Error(limited.message ?? "محاولات كثيرة");
  }
}

export async function loadMachineExportRows(input: unknown): Promise<ExportRow[]> {
  await requireExportRate();
  const { profile } = await requireUser();
  const parsed = exportMachineSchema.safeParse(input);
  if (!parsed.success) return [];
  const { rows } = await getMachineReport({
    organizationId: profile.organizationId,
    machineId: parsed.data.machineId,
    from: parsed.data.from ? new Date(parsed.data.from) : undefined,
    to: parseDayEnd(parsed.data.to),
  });
  return rows.map((r) => [
    r.item.name,
    r.item.code,
    formatDateTime(r.createdAt),
    r.performedBy.fullName,
    r.notes,
  ]);
}

export async function loadItemTimelineExportRows(
  input: unknown,
): Promise<ExportRow[]> {
  await requireExportRate();
  const { profile } = await requireUser();
  const parsed = exportItemSchema.safeParse(input);
  if (!parsed.success) return [];
  const timeline = await getItemTimeline({
    organizationId: profile.organizationId,
    itemId: parsed.data.itemId,
  });
  return timeline.map((t) => [
    TransactionTypeLabel[t.type],
    t.machine?.name,
    t.performedBy.fullName,
    formatDateTime(t.createdAt),
    t.notes,
  ]);
}

export async function loadMaterialExportRows(
  input: unknown,
): Promise<ExportRow[]> {
  await requireExportRate();
  const { profile } = await requireUser();
  const parsed = exportMaterialSchema.safeParse(input);
  if (!parsed.success) return [];
  const report = await getMaterialReport({
    organizationId: profile.organizationId,
    itemId: parsed.data.itemId,
    from: parsed.data.from ? new Date(parsed.data.from) : undefined,
    to: parseDayEnd(parsed.data.to),
  });
  if (!report) return [];
  return report.rows.map((r) => [
    TransactionTypeLabel[r.type],
    r.machine?.name,
    r.performedBy.fullName,
    formatDateTime(r.createdAt),
    r.notes,
  ]);
}

export async function loadRepairStatusExportRows(): Promise<ExportRow[]> {
  await requireExportRate();
  const { profile } = await requireUser();
  const { rows } = await getRepairStatusReport(profile.organizationId, {
    page: 1,
    pageSize: 100,
  });
  return rows.map((r) => [
    r.name,
    r.code,
    r.categoryName,
    r.since ? formatDateTime(r.since) : "",
  ]);
}

export async function loadMonthlyExportRows(
  input: unknown,
): Promise<ExportRow[]> {
  await requireExportRate();
  const { profile } = await requireRole(["ADMIN"]);
  const parsed = exportMonthlySchema.safeParse(input);
  if (!parsed.success) return [];
  const summary = await getMonthlySummary({
    organizationId: profile.organizationId,
    year: parsed.data.year,
    month: parsed.data.month,
  });
  return [
    ...Object.entries(summary.byType).map(([type, count]) => [
      "النوع",
      TransactionTypeLabel[type as keyof typeof TransactionTypeLabel] ?? type,
      count,
    ]),
    ...Object.entries(summary.byCategory).map(([name, count]) => [
      "التصنيف",
      name,
      count,
    ]),
  ];
}
