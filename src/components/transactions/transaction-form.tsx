"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  createTransactionAction,
  searchTransactionItemsAction,
} from "@/actions";
import type { CreateTransactionInput } from "@/lib/validations";
import { ItemStatus, ItemStatusLabel } from "@/types/domain";
import type { TransactionFormItem } from "@/services/item-form";
import { SearchCombobox } from "@/components/shared/search-combobox";
import { LoadingButton } from "@/components/shared/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ui } from "@/lib/ui";

type CategoryOption = { id: string; name: string };
type MachineOption = { id: string; name: string };

const TYPE_OPTIONS = [
  { value: "ISSUE", label: "صرف لمكينة" },
  { value: "RETURN_FROM_MACHINE", label: "إرجاع من مكينة" },
  { value: "ADDITION", label: "إضافة أداة جديدة" },
  { value: "SEND_TO_REPAIR", label: "إخراج للتصليح" },
  { value: "RETURN_FROM_REPAIR", label: "رجوع من التصليح" },
] as const;

function toFormItem(
  row: Awaited<ReturnType<typeof searchTransactionItemsAction>>[number],
): TransactionFormItem {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    categoryName: row.categoryName,
    status: row.status as TransactionFormItem["status"],
    machineName: row.machineName,
    hasOutstandingIssue: row.hasOutstandingIssue,
  };
}

export function TransactionForm({
  categories,
  machines,
  items: initialItems,
}: {
  categories: CategoryOption[];
  machines: MachineOption[];
  items: TransactionFormItem[];
}) {
  const [type, setType] =
    useState<(typeof TYPE_OPTIONS)[number]["value"]>("ISSUE");
  const [itemId, setItemId] = useState("");
  const [machineId, setMachineId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [notes, setNotes] = useState("");
  const [searchResults, setSearchResults] = useState<TransactionFormItem[] | null>(
    null,
  );
  const [selectedItem, setSelectedItem] = useState<TransactionFormItem | null>(
    null,
  );
  const [pending, startTransition] = useTransition();
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const items = searchResults ?? initialItems;

  useEffect(() => {
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, []);

  const filteredItems = useMemo(() => {
    let list = items;
    if (type === "RETURN_FROM_REPAIR") {
      list = list.filter((i) => i.status === ItemStatus.IN_REPAIR);
    } else if (type === "RETURN_FROM_MACHINE") {
      list = list.filter((i) => i.hasOutstandingIssue);
    } else if (type === "ISSUE") {
      list = list.filter((i) => i.status === ItemStatus.AVAILABLE);
    } else if (type === "SEND_TO_REPAIR") {
      list = list.filter((i) => i.status !== ItemStatus.IN_REPAIR);
    }

    if (selectedItem && !list.some((i) => i.id === selectedItem.id)) {
      list = [selectedItem, ...list];
    }

    return list;
  }, [items, type, selectedItem]);
  const itemOptions = useMemo(
    () =>
      filteredItems.map((item) => ({
        value: item.id,
        label: `${item.name}${item.code ? ` (${item.code})` : ""} — ${ItemStatusLabel[item.status]}${
          item.machineName ? ` / ${item.machineName}` : ""
        }`,
        keywords: `${item.name} ${item.code ?? ""} ${item.categoryName}`,
      })),
    [filteredItems],
  );

  const machineOptions = useMemo(
    () =>
      machines.map((m) => ({
        value: m.id,
        label: m.name,
      })),
    [machines],
  );

  const categoryOptions = useMemo(
    () =>
      categories.map((c) => ({
        value: c.id,
        label: c.name,
      })),
    [categories],
  );

  function onItemSearch(query: string) {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      void (async () => {
        const rows = await searchTransactionItemsAction(query);
        setSearchResults(rows.map(toFormItem));
      })();
    }, 250);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    let payload: CreateTransactionInput;

    if (type === "ADDITION") {
      payload = {
        type: "ADDITION",
        name,
        categoryId,
        code: code || null,
        quantity: Number(quantity),
        notes: notes || null,
      };
    } else if (type === "ISSUE") {
      payload = {
        type: "ISSUE",
        itemId,
        machineId,
        notes: notes || null,
      };
    } else {
      payload = {
        type,
        itemId,
        notes: notes || null,
      };
    }

    startTransition(async () => {
      const result = await createTransactionAction(payload);
      if (result.success) {
        toast.success(result.message ?? "تم بنجاح");
        setItemId("");
        setSelectedItem(null);
        setMachineId("");
        setName("");
        setCode("");
        setQuantity("1");
        setNotes("");
      } else {
        toast.error(result.message ?? "فشل التسجيل");
      }
    });
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>تسجيل حركة</CardTitle>
        <CardDescription>
          اختر نوع الحركة ثم أكمل الحقول المطلوبة
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>نوع الحركة</Label>
            <Select
              value={type}
              onValueChange={(v) => {
                if (!v) return;
                setType(v as typeof type);
                setItemId("");
                setSelectedItem(null);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {type === "ADDITION" ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="name">اسم الأداة</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>التصنيف</Label>
                <SearchCombobox
                  options={categoryOptions}
                  value={categoryId}
                  onChange={setCategoryId}
                  placeholder="ابحث واختر التصنيف"
                  searchPlaceholder="اسم التصنيف..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">الرمز (اختياري)</Label>
                <Input
                  id="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity">عدد المادة</Label>
                <Input
                  id="quantity"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  dir="ltr"
                  required
                />
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <Label>الأداة</Label>
              <SearchCombobox
                options={itemOptions}
                value={itemId}
                onChange={(id) => {
                  setItemId(id);
                  setSelectedItem(
                    filteredItems.find((i) => i.id === id) ?? null,
                  );
                }}
                placeholder="ابحث باسم الأداة أو الرمز..."
                searchPlaceholder="اكتب للبحث..."
                emptyText="لا توجد أدوات مطابقة — جرّب كلمات أخرى"
                onSearchChange={onItemSearch}
                serverFilter
              />
            </div>
          )}

          {type === "ISSUE" ? (
            <div className="space-y-2">
              <Label>المكينة</Label>
              <SearchCombobox
                options={machineOptions}
                value={machineId}
                onChange={setMachineId}
                placeholder="ابحث واختر المكينة"
                searchPlaceholder="اسم المكينة..."
              />
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="notes">ملاحظات (اختياري)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <LoadingButton
            type="submit"
            loading={pending}
            loadingText={ui.saving}
            className="w-full sm:w-auto"
          >
            تسجيل الحركة
          </LoadingButton>
        </form>
      </CardContent>
    </Card>
  );
}
