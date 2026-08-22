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
  { value: "STOCK_ADDITION", label: "إضافة على المواد" },
  { value: "ADDITION", label: "إضافة أداة جديدة" },
  { value: "SEND_TO_REPAIR", label: "إخراج للتصليح" },
  { value: "RETURN_FROM_REPAIR", label: "رجوع من التصليح" },
] as const;

type TransactionFormType = (typeof TYPE_OPTIONS)[number]["value"];

function toFormItem(
  row: Awaited<ReturnType<typeof searchTransactionItemsAction>>[number],
): TransactionFormItem {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    categoryName: row.categoryName,
    quantity: row.quantity,
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
  const [type, setType] = useState<TransactionFormType>("ISSUE");
  const [itemId, setItemId] = useState("");
  const [machineId, setMachineId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [issueQuantity, setIssueQuantity] = useState("1");
  const [stockQuantity, setStockQuantity] = useState("1");
  const [minQuantity, setMinQuantity] = useState("0");
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
  const selectedAvailableQty = selectedItem?.quantity ?? null;

  const itemOptions = useMemo(
    () =>
      filteredItems.map((item) => ({
        value: item.id,
        label: `${item.name}${item.code ? ` (${item.code})` : ""} — ${ItemStatusLabel[item.status]}${
          item.machineName ? ` / ${item.machineName}` : ""
        }${type === "ISSUE" || type === "STOCK_ADDITION" ? ` — رصيد ${item.quantity}` : ""}`,
        keywords: `${item.name} ${item.code ?? ""} ${item.categoryName}`,
      })),
    [filteredItems, type],
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
        minQuantity: Number(minQuantity),
        notes: notes || null,
      };
    } else if (type === "ISSUE") {
      payload = {
        type: "ISSUE",
        itemId,
        machineId,
        quantity: Number(issueQuantity),
        notes: notes || null,
      };
    } else if (type === "STOCK_ADDITION") {
      payload = {
        type: "STOCK_ADDITION",
        itemId,
        quantity: Number(stockQuantity),
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
        if (result.warning) {
          toast.warning(result.warning, { duration: 10_000 });
        }
        setItemId("");
        setSelectedItem(null);
        setMachineId("");
        setName("");
        setCode("");
        setQuantity("1");
        setIssueQuantity("1");
        setStockQuantity("1");
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
                setType(v as TransactionFormType);
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
              <div className="space-y-2">
                <Label htmlFor="minQuantity">الحد الأدنى للتنبيه</Label>
                <Input
                  id="minQuantity"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  value={minQuantity}
                  onChange={(e) => setMinQuantity(e.target.value)}
                  dir="ltr"
                />
                <p className={ui.subtitle}>
                  0 = بلا تنبيه. يُنبَّه عند الكمية ≤ هذا الحد.
                </p>
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
            <div className="grid gap-4 sm:grid-cols-[1fr_min(7.5rem,28%)]">
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
              <div className="space-y-2">
                <Label htmlFor="issue-qty">العدد</Label>
                <Input
                  id="issue-qty"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={selectedAvailableQty ?? undefined}
                  step={1}
                  value={issueQuantity}
                  onChange={(e) => setIssueQuantity(e.target.value)}
                  dir="ltr"
                  required
                />
                {selectedAvailableQty != null ? (
                  <p className={ui.subtitle}>المتاح: {selectedAvailableQty}</p>
                ) : null}
              </div>
            </div>
          ) : null}

          {type === "STOCK_ADDITION" ? (
            <div className="space-y-2">
              <Label htmlFor="stock-qty">العدد المُضاف</Label>
              <Input
                id="stock-qty"
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                value={stockQuantity}
                onChange={(e) => setStockQuantity(e.target.value)}
                dir="ltr"
                required
              />
              {selectedAvailableQty != null ? (
                <p className={ui.subtitle}>
                  الرصيد الحالي: {selectedAvailableQty} — بعد الإضافة:{" "}
                  {selectedAvailableQty + Number(stockQuantity || 0)}
                </p>
              ) : (
                <p className={ui.subtitle}>
                  اختر المادة أولاً لمعرفة الرصيد الحالي
                </p>
              )}
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
