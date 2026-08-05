"use client";

import { useState } from "react";
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
import { useCrudManager } from "@/hooks/use-crud-manager";
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
  const crud = useCrudManager<MachineRow>();
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");

  return (
    <div className="space-y-4">
      {!readOnly ? (
        <div className="flex justify-end">
          <Dialog open={crud.open} onOpenChange={crud.setOpen}>
            <Button
              onClick={() =>
                crud.beginCreate(() => {
                  setName("");
                  setLocation("");
                })
              }
              disabled={crud.pending}
            >
              إضافة مكينة
            </Button>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {crud.editing ? "تعديل المكينة" : "إضافة مكينة"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="machine-name">اسم / رقم المكينة</Label>
                  <Input
                    id="machine-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={crud.pending}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="machine-location">الموقع (اختياري)</Label>
                  <Input
                    id="machine-location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    disabled={crud.pending}
                  />
                </div>
                <LoadingButton
                  onClick={() => {
                    const payload = { name, location: location || null };
                    crud.runSave(() =>
                      crud.editing
                        ? updateMachineAction(crud.editing.id, payload)
                        : createMachineAction(payload),
                    );
                  }}
                  loading={crud.pending}
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
        open={Boolean(crud.deleteId)}
        onOpenChange={(next) => {
          if (!next) crud.setDeleteId(null);
        }}
        title="حذف المكينة"
        description="هل أنت متأكد من حذف هذه المكينة؟"
        confirmLabel="حذف"
        destructive
        loading={crud.pending}
        onConfirm={() => crud.runDelete(deleteMachineAction)}
      />

      <BusyOverlay busy={crud.tableBusy} label={crud.busyLabel}>
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
                        onClick={() =>
                          crud.beginEdit(m, (row) => {
                            setName(row.name);
                            setLocation(row.location ?? "");
                          })
                        }
                        disabled={crud.pending}
                      >
                        تعديل
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={crud.pending}
                        onClick={() => crud.setDeleteId(m.id)}
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
