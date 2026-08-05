"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { ActionResult } from "@/actions";
import { ui } from "@/lib/ui";

/**
 * حالة مشتركة لمدراء CRUD: حوار إنشاء/تعديل + تأكيد حذف + toast.
 */
export function useCrudManager<T extends { id: string }>() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [busyLabel, setBusyLabel] = useState<string>(ui.saving);

  function beginCreate(resetFields: () => void) {
    setEditing(null);
    resetFields();
    setOpen(true);
  }

  function beginEdit(row: T, hydrateFields: (row: T) => void) {
    setEditing(row);
    hydrateFields(row);
    setOpen(true);
  }

  function runSave(action: () => Promise<ActionResult>) {
    setBusyLabel(ui.saving);
    startTransition(async () => {
      const result = await action();
      if (result.success) {
        toast.success(result.message);
        setOpen(false);
      } else {
        toast.error(result.message);
      }
    });
  }

  function runDelete(action: (id: string) => Promise<ActionResult>) {
    if (!deleteId) return;
    setBusyLabel(ui.deleting);
    startTransition(async () => {
      const result = await action(deleteId);
      if (result.success) toast.success(result.message);
      else toast.error(result.message);
      setDeleteId(null);
    });
  }

  return {
    open,
    setOpen,
    editing,
    deleteId,
    setDeleteId,
    pending,
    busyLabel,
    beginCreate,
    beginEdit,
    runSave,
    runDelete,
    tableBusy: pending && !open && !deleteId,
  };
}
