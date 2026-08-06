"use client";

import { useEffect, useState } from "react";
import {
  createItemAction,
  deleteItemAction,
  updateItemAction,
} from "@/actions";
import type { ItemWithStatus } from "@/services/items";
import { useCrudManager } from "@/hooks/use-crud-manager";
import { StatusBadge } from "@/components/shared/status-badge";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ui } from "@/lib/ui";

type CategoryOption = { id: string; name: string };

function ItemFormDialog({
  open,
  onOpenChange,
  editing,
  categories,
  pending,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: ItemWithStatus | null;
  categories: CategoryOption[];
  pending: boolean;
  onSubmit: (payload: {
    name: string;
    code: string | null;
    categoryId: string;
    quantity: number;
    notes: string | null;
  }) => void;
}) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setName(editing.name);
      setCode(editing.code ?? "");
      setCategoryId(editing.categoryId);
      setQuantity(String(editing.quantity ?? 1));
      setNotes(editing.notes ?? "");
    } else {
      setName("");
      setCode("");
      setCategoryId(categories[0]?.id ?? "");
      setQuantity("1");
      setNotes("");
    }
  }, [open, editing, categories]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editing ? "تعديل الأداة" : "إضافة أداة"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="item-name">اسم الأداة</Label>
            <Input
              id="item-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={pending}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="item-code">الرمز (اختياري)</Label>
            <Input
              id="item-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              dir="ltr"
              disabled={pending}
            />
          </div>
          <div className="space-y-1.5">
            <Label>التصنيف</Label>
            <Select
              value={categoryId}
              onValueChange={(v) => setCategoryId(v ?? "")}
              disabled={pending}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="التصنيف">
                  {categories.find((c) => c.id === categoryId)?.name ??
                    "التصنيف"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="item-qty">عدد المادة</Label>
            <Input
              id="item-qty"
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              dir="ltr"
              disabled={pending}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="item-notes">ملاحظات (اختياري)</Label>
            <Input
              id="item-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={pending}
            />
          </div>
          <LoadingButton
            onClick={() =>
              onSubmit({
                name,
                code: code || null,
                categoryId,
                quantity: Number(quantity),
                notes: notes || null,
              })
            }
            loading={pending}
            loadingText={ui.saving}
            disabled={!name.trim() || !categoryId}
          >
            حفظ
          </LoadingButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ItemsTable({
  items,
  readOnly,
  pending,
  onEdit,
  onDelete,
}: {
  items: ItemWithStatus[];
  readOnly: boolean;
  pending: boolean;
  onEdit: (item: ItemWithStatus) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <Table className="table-fixed">
      <TableHeader>
        <TableRow>
          <TableHead className="w-[26%]">الأداة</TableHead>
          <TableHead className="w-[20%]">التصنيف</TableHead>
          <TableHead className="w-[12%]">العدد</TableHead>
          <TableHead className="w-[20%]">الحالة</TableHead>
          {!readOnly ? (
            <TableHead className="w-[22%]">إجراءات</TableHead>
          ) : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={readOnly ? 4 : 5}
              className={ui.emptyCell}
            >
              لا توجد أدوات مطابقة
            </TableCell>
          </TableRow>
        ) : (
          items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="whitespace-normal">
                <div className="font-medium">{item.name}</div>
                {item.code ? (
                  <div className="text-xs text-muted-foreground" dir="ltr">
                    {item.code}
                  </div>
                ) : null}
              </TableCell>
              <TableCell className="whitespace-normal">
                {item.categoryName}
              </TableCell>
              <TableCell dir="ltr">{item.quantity}</TableCell>
              <TableCell>
                <div className="flex flex-col items-center gap-1">
                  <StatusBadge status={item.status} />
                  {item.machineName ? (
                    <p className="text-xs text-muted-foreground">
                      {item.machineName}
                    </p>
                  ) : null}
                </div>
              </TableCell>
              {!readOnly ? (
                <TableCell className={ui.tableActions}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(item)}
                    disabled={pending}
                  >
                    تعديل
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={pending}
                    onClick={() => onDelete(item.id)}
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
  );
}

export function ItemsManager({
  items,
  categories,
  readOnly = false,
}: {
  items: ItemWithStatus[];
  categories: CategoryOption[];
  readOnly?: boolean;
}) {
  const crud = useCrudManager<ItemWithStatus>();

  return (
    <div className="space-y-4">
      {!readOnly ? (
        <div className="flex justify-end">
          <Button
            onClick={() => crud.beginCreate(() => undefined)}
            disabled={crud.pending}
          >
            إضافة أداة
          </Button>
          <ItemFormDialog
            open={crud.open}
            onOpenChange={crud.setOpen}
            editing={crud.editing}
            categories={categories}
            pending={crud.pending}
            onSubmit={(payload) =>
              crud.runSave(() =>
                crud.editing
                  ? updateItemAction(crud.editing.id, payload)
                  : createItemAction(payload),
              )
            }
          />
        </div>
      ) : null}

      <ConfirmDialog
        open={Boolean(crud.deleteId)}
        onOpenChange={(next) => {
          if (!next) crud.setDeleteId(null);
        }}
        title="إخفاء الأداة"
        description="ستُخفى الأداة من القوائم (حذف ناعم) ولن تُحذف حركاتها من السجل. لا يظهر زر استعادة حالياً — راجع المدير قبل المتابعة."
        confirmLabel="إخفاء"
        destructive
        loading={crud.pending}
        onConfirm={() => crud.runDelete(deleteItemAction)}
      />

      <BusyOverlay busy={crud.tableBusy} label={crud.busyLabel}>
        <ItemsTable
          items={items}
          readOnly={readOnly}
          pending={crud.pending}
          onEdit={(item) => crud.beginEdit(item, () => undefined)}
          onDelete={crud.setDeleteId}
        />
      </BusyOverlay>
    </div>
  );
}
