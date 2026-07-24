"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  deleteTransactionAction,
  updateTransactionNotesAction,
} from "@/actions";
import type { TransactionType } from "@/generated/prisma/client";
import { formatDateTime } from "@/lib/format";
import { ui } from "@/lib/ui";
import { BusyOverlay } from "@/components/shared/busy-overlay";
import { LoadingButton } from "@/components/shared/loading-button";
import { TransactionTypeBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type TransactionRow = {
  id: string;
  type: TransactionType;
  notes: string | null;
  createdAt: Date | string;
  item: { id: string; name: string; code: string | null };
  machine: { id: string; name: string } | null;
  performedBy: { id: string; fullName: string };
};

export function TransactionsTable({
  rows,
  canManage,
  currentUserId,
}: {
  rows: TransactionRow[];
  canManage: boolean;
  currentUserId: string;
}) {
  const [pending, startTransition] = useTransition();
  const [busyLabel, setBusyLabel] = useState<string>(ui.saving);
  const [editing, setEditing] = useState<TransactionRow | null>(null);
  const [notes, setNotes] = useState("");

  function openNotes(row: TransactionRow) {
    setEditing(row);
    setNotes(row.notes ?? "");
  }

  function saveNotes() {
    if (!editing) return;
    setBusyLabel(ui.saving);
    startTransition(async () => {
      const result = await updateTransactionNotesAction(editing.id, { notes });
      if (result.success) {
        toast.success(result.message);
        setEditing(null);
      } else toast.error(result.message);
    });
  }

  function onDelete(id: string) {
    if (
      !confirm(
        "حذف آخر حركة لهذه الأداة؟ لا يمكن التراجع. استخدمه فقط لتصحيح خطأ.",
      )
    ) {
      return;
    }
    setBusyLabel(ui.deleting);
    startTransition(async () => {
      const result = await deleteTransactionAction(id);
      if (result.success) toast.success(result.message);
      else toast.error(result.message);
    });
  }

  return (
    <>
      <BusyOverlay busy={pending && !editing} label={busyLabel}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>النوع</TableHead>
              <TableHead>الأداة</TableHead>
              <TableHead>المكينة</TableHead>
              <TableHead>ملاحظات</TableHead>
              <TableHead>بواسطة</TableHead>
              <TableHead>التاريخ</TableHead>
              <TableHead>إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className={ui.emptyCell}>
                  لا توجد نتائج
                </TableCell>
              </TableRow>
            ) : (
              rows.map((tx) => {
                const canEditNotes =
                  canManage || tx.performedBy.id === currentUserId;
                return (
                  <TableRow key={tx.id}>
                    <TableCell>
                      <TransactionTypeBadge type={tx.type} />
                    </TableCell>
                    <TableCell>{tx.item.name}</TableCell>
                    <TableCell>{tx.machine?.name ?? "—"}</TableCell>
                    <TableCell className="max-w-[12rem] truncate text-sm text-muted-foreground">
                      {tx.notes || "—"}
                    </TableCell>
                    <TableCell>{tx.performedBy.fullName}</TableCell>
                    <TableCell>{formatDateTime(tx.createdAt)}</TableCell>
                    <TableCell className={ui.tableActions}>
                      {canEditNotes ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={pending}
                          onClick={() => openNotes(tx)}
                        >
                          ملاحظات
                        </Button>
                      ) : null}
                      {canManage ? (
                        <LoadingButton
                          size="sm"
                          variant="destructive"
                          loading={pending}
                          loadingText={ui.deleting}
                          onClick={() => onDelete(tx.id)}
                        >
                          حذف
                        </LoadingButton>
                      ) : null}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </BusyOverlay>

      <Dialog
        open={!!editing}
        onOpenChange={(open) => {
          if (!open && !pending) setEditing(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تعديل ملاحظات الحركة</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ملاحظات (اختياري)"
              rows={4}
              disabled={pending}
            />
            <LoadingButton
              onClick={saveNotes}
              loading={pending}
              loadingText={ui.saving}
            >
              حفظ
            </LoadingButton>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
