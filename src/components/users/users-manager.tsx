"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  createUserAction,
  toggleUserActiveAction,
  updateUserAction,
} from "@/actions";
import { RoleLabel } from "@/types/domain";
import { BusyOverlay } from "@/components/shared/busy-overlay";
import { LoadingButton } from "@/components/shared/loading-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

type UserRow = {
  id: string;
  fullName: string;
  role: "ADMIN" | "KEEPER";
  isActive: boolean;
};

export function UsersManager({
  users,
  currentUserId,
}: {
  users: UserRow[];
  currentUserId: string;
}) {
  const [pending, startTransition] = useTransition();
  const [busyLabel, setBusyLabel] = useState<string>(ui.saving);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"ADMIN" | "KEEPER">("KEEPER");

  function openCreate() {
    setEditing(null);
    setFullName("");
    setEmail("");
    setPassword("");
    setRole("KEEPER");
    setOpen(true);
  }

  function openEdit(user: UserRow) {
    setEditing(user);
    setFullName(user.fullName);
    setRole(user.role);
    setEmail("");
    setPassword("");
    setOpen(true);
  }

  function onSave() {
    setBusyLabel(ui.saving);
    startTransition(async () => {
      if (editing) {
        const result = await updateUserAction(editing.id, { fullName, role });
        if (result.success) {
          toast.success(result.message);
          setOpen(false);
        } else toast.error(result.message);
        return;
      }

      const result = await createUserAction({
        fullName,
        email,
        password,
        role,
      });
      if (result.success) {
        toast.success(result.message);
        setOpen(false);
      } else toast.error(result.message);
    });
  }

  function toggleActive(id: string) {
    setBusyLabel("جاري التحديث...");
    startTransition(async () => {
      const result = await toggleUserActiveAction(id);
      if (result.success) toast.success(result.message);
      else toast.error(result.message);
    });
  }

  const canSave = editing
    ? fullName.trim().length >= 2
    : fullName.trim().length >= 2 &&
      email.includes("@") &&
      password.length >= 8;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <Button onClick={openCreate} disabled={pending}>
            إضافة حساب
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editing ? "تعديل الحساب" : "إضافة حساب"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>الاسم</Label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="الاسم الكامل"
                  disabled={pending}
                />
              </div>
              {!editing ? (
                <>
                  <div className="space-y-1.5">
                    <Label>البريد الإلكتروني</Label>
                    <Input
                      type="email"
                      dir="ltr"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="user@example.com"
                      disabled={pending}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>كلمة المرور</Label>
                    <Input
                      type="password"
                      dir="ltr"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="8 أحرف على الأقل"
                      disabled={pending}
                    />
                  </div>
                </>
              ) : null}
              <div className="space-y-1.5">
                <Label>الدور</Label>
                <Select
                  value={role}
                  onValueChange={(v) => {
                    if (v === "ADMIN" || v === "KEEPER") setRole(v);
                  }}
                  disabled={editing?.id === currentUserId || pending}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>{RoleLabel[role]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="KEEPER">{RoleLabel.KEEPER}</SelectItem>
                    <SelectItem value="ADMIN">{RoleLabel.ADMIN}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <LoadingButton
                onClick={onSave}
                loading={pending}
                loadingText={ui.saving}
                disabled={!canSave}
              >
                حفظ
              </LoadingButton>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <BusyOverlay busy={pending && !open} label={busyLabel}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الاسم</TableHead>
              <TableHead>الدور</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className={ui.emptyCell}>
                  لا توجد حسابات
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.fullName}</TableCell>
                  <TableCell>{RoleLabel[user.role]}</TableCell>
                  <TableCell>
                    <Badge variant={user.isActive ? "default" : "secondary"}>
                      {user.isActive ? "نشط" : "موقوف"}
                    </Badge>
                  </TableCell>
                  <TableCell className={ui.tableActions}>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() => openEdit(user)}
                    >
                      تعديل
                    </Button>
                    {user.id !== currentUserId ? (
                      <LoadingButton
                        size="sm"
                        variant="destructive"
                        loading={pending}
                        loadingText="جاري التحديث..."
                        onClick={() => toggleActive(user.id)}
                      >
                        {user.isActive ? "إيقاف" : "تفعيل"}
                      </LoadingButton>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        حسابك
                      </span>
                    )}
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
