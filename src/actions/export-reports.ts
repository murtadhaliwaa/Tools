"use server";

import { requireUser, requireRole } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import type { ExportRow } from "@/lib/export-report";
import {
  getItemTimeline,
  getMachineReport,
  getMaterialReport,
  getMonthlySummary,
  getRepairStatusReport,
} from "@/services/reports";
import { TransactionTypeLabel } from "@/types/domain";

export async function loadMachineExportRows(input: {
  machineId: string;
  from?: string;
  to?: string;
}): Promise<ExportRow[]> {
  const { profile } = await requireUser();
  if (!input.machineId) return [];
  const rows = await getMachineReport({
    organizationId: profile.organizationId,
    machineId: input.machineId,
    from: input.from ? new Date(input.from) : undefined,
    to: input.to ? new Date(`${input.to}T23:59:59`) : undefined,
  });
  return rows.map((r) => [
    r.item.name,
    r.item.code,
    formatDateTime(r.createdAt),
    r.performedBy.fullName,
    r.notes,
  ]);
}

export async function loadItemTimelineExportRows(input: {
  itemId: string;
}): Promise<ExportRow[]> {
  const { profile } = await requireUser();
  if (!input.itemId) return [];
  const timeline = await getItemTimeline({
    organizationId: profile.organizationId,
    itemId: input.itemId,
  });
  return timeline.map((t) => [
    TransactionTypeLabel[t.type],
    t.machine?.name,
    t.performedBy.fullName,
    formatDateTime(t.createdAt),
    t.notes,
  ]);
}

export async function loadMaterialExportRows(input: {
  itemId: string;
  from?: string;
  to?: string;
}): Promise<ExportRow[]> {
  const { profile } = await requireUser();
  if (!input.itemId) return [];
  const report = await getMaterialReport({
    organizationId: profile.organizationId,
    itemId: input.itemId,
    from: input.from ? new Date(input.from) : undefined,
    to: input.to ? new Date(`${input.to}T23:59:59`) : undefined,
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
  const { profile } = await requireUser();
  const rows = await getRepairStatusReport(profile.organizationId);
  return rows.map((r) => [
    r.name,
    r.code,
    r.categoryName,
    r.since ? formatDateTime(r.since) : "",
  ]);
}

export async function loadMonthlyExportRows(input: {
  year: number;
  month: number;
}): Promise<ExportRow[]> {
  const { profile } = await requireRole(["ADMIN"]);
  const summary = await getMonthlySummary({
    organizationId: profile.organizationId,
    year: input.year,
    month: input.month,
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
