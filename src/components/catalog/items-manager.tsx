"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  createItemAction,
  deleteItemAction,
  updateItemAction,
} from "@/actions";
import type { ItemWithStatus } from "@/services/items";
import { StatusBadge } from "@/components/shared/status-badge";
import { BusyOverlay } from "@/components/shared/busy-overlay";
import { LoadingButton } from "@/components/shared/loading-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export function ItemsManager({
  items,
  categories,
  readOnly = false,
}: {
  items: ItemWithStatus[];
  categories: CategoryOption[];
  readOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ItemWithStatus | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [notes, setNotes] = useState("");
  const [pending, startTransition] = useTransition();
  const [busyLabel, setBusyLabel] = useState<string>(ui.saving);

  function openCreate() {
    setEditing(null);
    setName("");
    setCode("");
    setCategoryId(categories[0]?.id ?? "");
    setQuantity("1");
    setNotes("");
    setOpen(true);
  }

  function openEdit(item: ItemWithStatus) {
    setEditing(item);
    setName(item.name);
    setCode(item.code ?? "");
    setCategoryId(item.categoryId);
    setQuantity(String(item.quantity ?? 1));
    setNotes(item.notes ?? "");
    setOpen(true);
  }

  function onSave() {
    setBusyLabel(ui.saving);
    startTransition(async () => {
      const payload = {
        name,
        code: code || null,
        categoryId,
        quantity: Number(quantity),
        notes: notes || null,
      };
      const result = editing
        ? await updateItemAction(editing.id, payload)
        : await createItemAction(payload);
      if (result.success) {
        toast.success(result.message);
        setOpen(false);
      } else {
        toast.error(result.message);
      }
    });
  }

  function onDelete(id: string) {
    if (!confirm("هل أنت متأكد من حذف الأداة؟")) return;
    setBusyLabel(ui.deleting);
    startTransition(async () => {
      const result = await deleteItemAction(id);
      if (result.success) toast.success(result.message);
      else toast.error(result.message);
    });
  }

  return (
    <div className="space-y-4">
      {!readOnly ? (
        <div className="flex justify-end">
          <Dialog open={open} onOpenChange={setOpen}>
            <Button onClick={openCreate} disabled={pending}>
              إضافة أداة
            </Button>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editing ? "تعديل الأداة" : "إضافة أداة"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="اسم الأداة"
                  disabled={pending}
                />
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="الرمز (اختياري)"
                  dir="ltr"
                  disabled={pending}
                />
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
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="عدد المادة"
                  dir="ltr"
                  disabled={pending}
                  aria-label="عدد المادة"
                />
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="ملاحظات (اختياري)"
                  disabled={pending}
                />
                <LoadingButton
                  onClick={onSave}
                  loading={pending}
                  loadingText={ui.saving}
                  disabled={!name.trim() || !categoryId}
                >
                  حفظ
                </LoadingButton>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      ) : null}

      <BusyOverlay busy={pending && !open} label={busyLabel}>
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
                        onClick={() => openEdit(item)}
                        disabled={pending}
                      >
                        تعديل
                      </Button>
                      <LoadingButton
                        variant="destructive"
                        size="sm"
                        loading={pending}
                        loadingText={ui.deleting}
                        onClick={() => onDelete(item.id)}
                      >
                        حذف
                      </LoadingButton>
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
