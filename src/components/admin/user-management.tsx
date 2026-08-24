"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Lock, Pencil, X } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import { escapeHtml, notifyTelegramUser } from "@/lib/telegram";
import type { ManagedUser } from "./types";

const ROLE_LABELS: Record<string, string> = {
  admin: "مدير",
  broker: "وسيط",
  worker: "عامل",
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "؟";
  if (parts.length === 1) return parts[0].slice(0, 2);
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("ar", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

interface UserManagementProps {
  users: ManagedUser[];
}

export function UserManagement({ users }: UserManagementProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [roleChoices, setRoleChoices] = useState<Record<string, string>>({});
  const [editUser, setEditUser] = useState<ManagedUser | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editRole, setEditRole] = useState<"admin" | "broker" | "worker">("worker");
  const [savingEdit, setSavingEdit] = useState(false);

  const pending = users.filter((u) => !u.is_approved && u.is_active);

  function roleFor(u: ManagedUser): string {
    return roleChoices[u.id] ?? u.requested_role ?? "worker";
  }

  async function approve(user: ManagedUser) {
    setBusyId(user.id);
    const { error } = await supabase.rpc("approve_user", {
      p_user_id: user.id,
      p_role: roleFor(user) as "admin" | "broker" | "worker",
    });
    setBusyId(null);

    if (error) {
      toast({
        title: "تعذر الاعتماد",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    toast({ title: "تم اعتماد المستخدم" });
    notifyTelegramUser(
      user.id,
      `مرحباً ${escapeHtml(user.full_name)}! تم اعتماد حسابك في منصة BTEC Brother 🎉`
    );
    router.refresh();
  }

  async function reject(user: ManagedUser) {
    setBusyId(user.id);
    const { error } = await supabase.rpc("reject_user", {
      p_user_id: user.id,
    });
    setBusyId(null);

    if (error) {
      toast({
        title: "تعذر الرفض",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    toast({ title: "تم رفض المستخدم" });
    router.refresh();
  }

  async function updateField(
    id: string,
    patch: {
      role?: "admin" | "broker" | "worker";
      is_active?: boolean;
      is_approved?: boolean;
    }
  ) {
    const { error } = await supabase.from("users").update(patch).eq("id", id);

    if (error) {
      toast({
        title: "تعذر التحديث",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    toast({ title: "تم تحديث الحالة" });
    router.refresh();
  }

  function openEdit(u: ManagedUser) {
    setEditUser(u);
    setEditName(u.full_name);
    setEditPhone(u.phone_number ?? "");
    setEditRole(u.role as "admin" | "broker" | "worker");
  }

  async function saveEdit() {
    if (!editUser || savingEdit) return;
    if (!editName.trim()) {
      toast({ title: "الاسم مطلوب", variant: "destructive" });
      return;
    }

    setSavingEdit(true);
    try {
      const { error } = await supabase
        .from("users")
        .update({
          full_name: editName.trim(),
          phone_number: editPhone.trim() || null,
          role: editRole,
        })
        .eq("id", editUser.id);

      if (error) {
        toast({
          title: "تعذر التحديث",
          description: error.message,
          variant: "destructive",
        });
        return;
      }
      toast({ title: "تم تحديث بيانات العضو" });
      setEditUser(null);
      router.refresh();
    } finally {
      setSavingEdit(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h2 className="font-display text-base font-bold text-ink">
          طلبات الانضمام المعلقة
        </h2>

        {pending.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            لا توجد طلبات انضمام معلقة.
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {pending.map((u) => (
              <Card key={u.id} className="flex flex-col gap-4 p-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 border border-border">
                    <AvatarFallback className="bg-bone text-xs font-semibold text-ink">
                      {initials(u.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">
                      {u.full_name}
                    </p>
                    <p className="truncate font-mono text-xs text-ash" dir="ltr">
                      {u.email}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  {u.phone_number && (
                    <span className="rounded-full bg-bone px-2 py-0.5 font-mono text-charcoal" dir="ltr">
                      {u.phone_number}
                    </span>
                  )}
                  <Badge variant="secondary" className="px-2 py-0 text-[10px]">
                    طلب: {ROLE_LABELS[u.requested_role] ?? u.requested_role}
                  </Badge>
                </div>

                <div className="flex items-center gap-2">
                  <Select
                    value={roleFor(u)}
                    onValueChange={(v) =>
                      setRoleChoices((prev) => ({ ...prev, [u.id]: v }))
                    }
                  >
                    <SelectTrigger className="h-9 w-24 shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="worker">عامل</SelectItem>
                      <SelectItem value="broker">وسيط</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    disabled={busyId === u.id}
                    className="flex-1 bg-ink text-background shadow-none hover:opacity-90"
                    onClick={() => approve(u)}
                  >
                    {busyId === u.id ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <>
                        <Check className="h-4 w-4" />
                        قبول
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyId === u.id}
                    onClick={() => reject(u)}
                  >
                    {busyId === u.id ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <>
                        <X className="h-4 w-4" />
                        رفض
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-base font-bold text-ink">
          جميع المستخدمين
        </h2>

        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-start">العضو</TableHead>
                <TableHead className="text-start">الدور المطلوب</TableHead>
                <TableHead className="text-start">الدور</TableHead>
                <TableHead className="text-start">الاعتماد</TableHead>
                <TableHead className="text-start">النشاط</TableHead>
                <TableHead className="text-start">تاريخ التسجيل</TableHead>
                <TableHead className="text-start">تعديل</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 border border-border">
                        <AvatarFallback className="bg-bone text-xs font-semibold text-ink">
                          {initials(u.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink">
                          {u.full_name}
                        </p>
                        <p
                          className="truncate font-mono text-xs text-ash"
                          dir="ltr"
                        >
                          {u.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="px-2 py-0 text-[10px]">
                      {ROLE_LABELS[u.requested_role] ?? u.requested_role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1 rounded-full bg-bone px-2 py-0.5 text-[11px] font-medium text-ink">
                      <Lock className="h-3 w-3 text-ash" />
                      {ROLE_LABELS[u.role] ?? u.role}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={u.is_approved ? "true" : "false"}
                      onValueChange={(v) =>
                        updateField(u.id, { is_approved: v === "true" })
                      }
                    >
                      <SelectTrigger className="h-8 w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">معتمد</SelectItem>
                        <SelectItem value="false">غير معتمد</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={u.is_active ? "true" : "false"}
                      onValueChange={(v) =>
                        updateField(u.id, { is_active: v === "true" })
                      }
                    >
                      <SelectTrigger className="h-8 w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">نشط</SelectItem>
                        <SelectItem value="false">غير نشط</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-ash">
                    {formatDate(u.created_at)}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="تعديل"
                      onClick={() => openEdit(u)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <Dialog
        open={!!editUser}
        onOpenChange={(open) => {
          if (!open) setEditUser(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تعديل بيانات العضو</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-name">الاسم الثلاثي</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-phone">رقم الهاتف</Label>
              <Input
                id="edit-phone"
                dir="ltr"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>الدور</Label>
              <Select
                value={editRole}
                onValueChange={(v) => setEditRole(v as "admin" | "broker" | "worker")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="worker">عامل</SelectItem>
                  <SelectItem value="broker">وسيط</SelectItem>
                  <SelectItem value="admin">مدير</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={savingEdit} onClick={() => setEditUser(null)}>
              إلغاء
            </Button>
            <Button disabled={savingEdit} onClick={saveEdit}>
              {savingEdit ? "جارٍ الحفظ…" : "حفظ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
