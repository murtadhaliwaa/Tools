"use client";

import { useState } from "react";
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
import { useCrudManager } from "@/hooks/use-crud-manager";
import { ui } from "@/lib/ui";

type CategoryRow = { id: string; name: string; _count: { items: number } };

export function CategoriesManager({
  categories,
}: {
  categories: CategoryRow[];
}) {
  const crud = useCrudManager<CategoryRow>();
  const [name, setName] = useState("");

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={crud.open} onOpenChange={crud.setOpen}>
          <Button
            onClick={() => crud.beginCreate(() => setName(""))}
            disabled={crud.pending}
          >
            إضافة تصنيف
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {crud.editing ? "تعديل التصنيف" : "إضافة تصنيف"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="category-name">اسم التصنيف</Label>
                <Input
                  id="category-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={crud.pending}
                />
              </div>
              <LoadingButton
                onClick={() =>
                  crud.runSave(() =>
                    crud.editing
                      ? updateCategoryAction(crud.editing.id, { name })
                      : createCategoryAction({ name }),
                  )
                }
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

      <ConfirmDialog
        open={Boolean(crud.deleteId)}
        onOpenChange={(next) => {
          if (!next) crud.setDeleteId(null);
        }}
        title="إخفاء التصنيف"
        description="ستُخفى التصنيف من القوائم (حذف ناعم) إن لم تكن هناك أدوات نشطة مرتبطة به. لا يظهر زر استعادة حالياً."
        confirmLabel="إخفاء"
        destructive
        loading={crud.pending}
        onConfirm={() => crud.runDelete(deleteCategoryAction)}
      />

      <BusyOverlay busy={crud.tableBusy} label={crud.busyLabel}>
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
                      onClick={() =>
                        crud.beginEdit(c, (row) => setName(row.name))
                      }
                      disabled={crud.pending}
                    >
                      تعديل
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={crud.pending}
                      onClick={() => crud.setDeleteId(c.id)}
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
