"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  createCategoryAction,
  deleteCategoryAction,
  updateCategoryAction,
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

type CategoryRow = { id: string; name: string; _count: { items: number } };

export function CategoriesManager({
  categories,
}: {
  categories: CategoryRow[];
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryRow | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();
  const [busyLabel, setBusyLabel] = useState<string>(ui.saving);

  function openCreate() {
    setEditing(null);
    setName("");
    setOpen(true);
  }

  function openEdit(row: CategoryRow) {
    setEditing(row);
    setName(row.name);
    setOpen(true);
  }

  function onSave() {
    setBusyLabel(ui.saving);
    startTransition(async () => {
      const result = editing
        ? await updateCategoryAction(editing.id, { name })
        : await createCategoryAction({ name });
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
      const result = await deleteCategoryAction(deleteId);
      if (result.success) toast.success(result.message);
      else toast.error(result.message);
      setDeleteId(null);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <Button onClick={openCreate} disabled={pending}>
            إضافة تصنيف
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editing ? "تعديل التصنيف" : "إضافة تصنيف"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="category-name">اسم التصنيف</Label>
                <Input
                  id="category-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
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

      <ConfirmDialog
        open={Boolean(deleteId)}
        onOpenChange={(next) => {
          if (!next) setDeleteId(null);
        }}
        title="حذف التصنيف"
        description="هل أنت متأكد من حذف هذا التصنيف؟"
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
              <TableHead>عدد الأدوات</TableHead>
              <TableHead>إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className={ui.emptyCell}>
                  لا توجد تصنيفات — أضف تصنيفاً للبدء
                </TableCell>
              </TableRow>
            ) : (
              categories.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>{c.name}</TableCell>
                  <TableCell>{c._count.items}</TableCell>
                  <TableCell className={ui.tableActions}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEdit(c)}
                      disabled={pending}
                    >
                      تعديل
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={pending}
                      onClick={() => setDeleteId(c.id)}
                    >
                      حذف
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </BusyOverlay>
    </div>
  );
}
