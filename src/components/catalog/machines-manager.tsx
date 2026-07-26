"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  createMachineAction,
  deleteMachineAction,
  updateMachineAction,
} from "@/actions";
import { BusyOverlay } from "@/components/shared/busy-overlay";
import { LoadingButton } from "@/components/shared/loading-button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { ui } from "@/lib/ui";

type MachineRow = {
  id: string;
  name: string;
  location: string | null;
};

export function MachinesManager({
  machines,
  readOnly = false,
}: {
  machines: MachineRow[];
  readOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MachineRow | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [pending, startTransition] = useTransition();
  const [busyLabel, setBusyLabel] = useState<string>(ui.saving);

  function openCreate() {
    setEditing(null);
    setName("");
    setLocation("");
    setOpen(true);
  }

  function openEdit(row: MachineRow) {
    setEditing(row);
    setName(row.name);
    setLocation(row.location ?? "");
    setOpen(true);
  }

  function onSave() {
    setBusyLabel(ui.saving);
    startTransition(async () => {
      const payload = { name, location: location || null };
      const result = editing
        ? await updateMachineAction(editing.id, payload)
        : await createMachineAction(payload);
      if (result.success) {
        toast.success(result.message);
        setOpen(false);
      } else {
        toast.error(result.message);
      }
    });
  }

  function onDeleteConfirmed() {
    if (!deleteId) return;
    setBusyLabel(ui.deleting);
    startTransition(async () => {
      const result = await deleteMachineAction(deleteId);
      if (result.success) toast.success(result.message);
      else toast.error(result.message);
      setDeleteId(null);
    });
  }

  return (
    <div className="space-y-4">
      {!readOnly ? (
        <div className="flex justify-end">
          <Dialog open={open} onOpenChange={setOpen}>
            <Button onClick={openCreate} disabled={pending}>
              إضافة مكينة
            </Button>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editing ? "تعديل المكينة" : "إضافة مكينة"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="machine-name">اسم / رقم المكينة</Label>
                  <Input
                    id="machine-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={pending}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="machine-location">الموقع (اختياري)</Label>
                  <Input
                    id="machine-location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    disabled={pending}
                  />
                </div>
                <LoadingButton
                  onClick={onSave}
                  loading={pending}
                  loadingText={ui.saving}
                  disabled={!name.trim()}
                >
                  حفظ
                </LoadingButton>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      ) : null}

      <ConfirmDialog
        open={Boolean(deleteId)}
        onOpenChange={(next) => {
          if (!next) setDeleteId(null);
        }}
        title="حذف المكينة"
        description="هل أنت متأكد من حذف هذه المكينة؟"
        confirmLabel="حذف"
        destructive
        loading={pending}
        onConfirm={onDeleteConfirmed}
      />

      <BusyOverlay busy={pending && !open && !deleteId} label={busyLabel}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الاسم</TableHead>
              <TableHead>الموقع</TableHead>
              {!readOnly ? <TableHead>إجراءات</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {machines.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={readOnly ? 2 : 3}
                  className={ui.emptyCell}
                >
                  لا توجد مكائن — أضف مكينة للبدء
                </TableCell>
              </TableRow>
            ) : (
              machines.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>{m.name}</TableCell>
                  <TableCell>{m.location ?? "—"}</TableCell>
                  {!readOnly ? (
                    <TableCell className={ui.tableActions}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEdit(m)}
                        disabled={pending}
                      >
                        تعديل
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={pending}
                        onClick={() => setDeleteId(m.id)}
                      >
                        حذف
                      </Button>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </BusyOverlay>
    </div>
  );
}
