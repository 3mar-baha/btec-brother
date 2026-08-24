"use client";

import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";

interface EditableOrder {
  id: string;
  order_number: number;
}

interface FormState {
  client_name: string;
  client_phone: string;
  client_school: string;
  title: string;
  unit_title: string;
  assignment_name: string;
  total_price: string;
  deadline: string;
}

const EMPTY: FormState = {
  client_name: "",
  client_phone: "",
  client_school: "",
  title: "",
  unit_title: "",
  assignment_name: "",
  total_price: "",
  deadline: "",
};

function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

interface EditOrderModalProps {
  order: EditableOrder;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
}

/**
 * Edit an order while it is still `open`. Client fields are fetched on demand
 * (never shipped to workers through the market query). The mutation goes
 * through the update_open_order RPC, which re-checks ownership and status.
 */
export function EditOrderModal({
  order,
  onOpenChange,
  onUpdated,
}: EditOrderModalProps) {
  const { toast } = useToast();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    createClient()
      .from("orders")
      .select(
        "client_name, client_phone, client_school, title, unit_title, assignment_name, total_price, deadline"
      )
      .eq("id", order.id)
      .single()
      .then(({ data, error }) => {
        if (!active) return;
        if (error || !data) {
          toast({
            title: "تعذر تحميل بيانات الطلب",
            description: error?.message,
            variant: "destructive",
          });
          onOpenChange(false);
          return;
        }
        setForm({
          client_name: data.client_name,
          client_phone: data.client_phone,
          client_school: data.client_school ?? "",
          title: data.title,
          unit_title: data.unit_title,
          assignment_name: data.assignment_name,
          total_price: String(data.total_price),
          deadline: toDatetimeLocal(data.deadline),
        });
        setLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.id]);

  function setField(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (
      !form.client_name.trim() ||
      !form.client_phone.trim() ||
      !form.title.trim() ||
      !form.unit_title.trim() ||
      !form.assignment_name.trim()
    ) {
      toast({
        title: "حقول ناقصة",
        description: "يرجى تعبئة جميع الحقول المطلوبة",
        variant: "destructive",
      });
      return;
    }
    const price = Number(form.total_price);
    if (Number.isNaN(price) || price <= 0) {
      toast({
        title: "قيمة غير صحيحة",
        description: "يرجى إدخال سعر صحيح أكبر من صفر",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    const { data, error } = await createClient()
      .rpc("update_open_order", {
        p_order_id: order.id,
        p_client_name: form.client_name.trim(),
        p_client_phone: form.client_phone.trim(),
        p_client_school: form.client_school.trim(),
        p_title: form.title.trim(),
        p_unit_title: form.unit_title.trim(),
        p_assignment_name: form.assignment_name.trim(),
        p_total_price: price,
        p_deadline: new Date(form.deadline).toISOString(),
      });
    setSaving(false);

    if (error) {
      toast({
        title: "تعذر تحديث الطلب",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "تم التحديث",
      description:
        (data as { message?: string } | null)?.message ?? "تم تحديث الطلب بنجاح",
    });
    onOpenChange(false);
    onUpdated();
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>تعديل الطلب #{order.order_number}</DialogTitle>
          <DialogDescription>
            التعديل متاح فقط قبل حجز الطلب من أحد العمال.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="animate-spin text-muted-foreground" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="عنوان الطلب">
                <Input
                  value={form.title}
                  onChange={(e) => setField("title", e.target.value)}
                />
              </Field>
              <Field label="اسم العميل">
                <Input
                  value={form.client_name}
                  onChange={(e) => setField("client_name", e.target.value)}
                />
              </Field>
              <Field label="هاتف العميل">
                <Input
                  dir="ltr"
                  value={form.client_phone}
                  onChange={(e) => setField("client_phone", e.target.value)}
                />
              </Field>
              <Field label="مدرسة العميل">
                <Input
                  value={form.client_school}
                  onChange={(e) => setField("client_school", e.target.value)}
                  placeholder="اختياري"
                />
              </Field>
              <Field label="عنوان الوحدة">
                <Input
                  value={form.unit_title}
                  onChange={(e) => setField("unit_title", e.target.value)}
                />
              </Field>
              <Field label="اسم التكليف">
                <Input
                  value={form.assignment_name}
                  onChange={(e) => setField("assignment_name", e.target.value)}
                />
              </Field>
              <Field label="السعر الإجمالي (د.أ)">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  dir="ltr"
                  value={form.total_price}
                  onChange={(e) => setField("total_price", e.target.value)}
                />
              </Field>
              <Field label="الموعد النهائي">
                <Input
                  type="datetime-local"
                  value={form.deadline}
                  onChange={(e) => setField("deadline", e.target.value)}
                />
              </Field>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => onOpenChange(false)}
              >
                إلغاء
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    حفظ التعديلات
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
