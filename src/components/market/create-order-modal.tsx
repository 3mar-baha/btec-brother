"use client";

import { useState } from "react";
import { Loader2, Paperclip, Upload } from "lucide-react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { BTEC_PRESETS, type BtecPreset } from "@/lib/btec-presets";
import { formatMoney } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import { escapeHtml, notifyTelegram } from "@/lib/telegram";
import type { Classification, CriteriaLevel } from "./types";

const EMPTY_FORM = {
  title: "",
  client_name: "",
  client_phone: "",
  specialisation_id: "",
  grade_id: "",
  criteria_id: "",
  unit_title: "",
  assignment_name: "",
  total_price: "",
  deadline: "",
};

type FormState = typeof EMPTY_FORM;

const REQUIRED: (keyof FormState)[] = [
  "title",
  "client_name",
  "client_phone",
  "specialisation_id",
  "grade_id",
  "criteria_id",
  "unit_title",
  "assignment_name",
  "total_price",
  "deadline",
];

interface CreateOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  specialisations: Classification[];
  gradeLevels: Classification[];
  criteriaLevels: CriteriaLevel[];
  onCreated: () => void;
}

export function CreateOrderModal({
  open,
  onOpenChange,
  specialisations,
  gradeLevels,
  criteriaLevels,
  onCreated,
}: CreateOrderModalProps) {
  const { toast } = useToast();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [files, setFiles] = useState<File[]>([]);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [presetId, setPresetId] = useState("none");

  function setField(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function applyPreset(preset: BtecPreset) {
    const spec = specialisations.find(
      (s) => s.name === preset.specialisationName
    );
    setForm((prev) => ({
      ...prev,
      title: preset.title,
      unit_title: preset.unit_title,
      specialisation_id: spec ? String(spec.id) : prev.specialisation_id,
    }));
  }

  function reset() {
    setForm(EMPTY_FORM);
    setFiles([]);
    setComment("");
    setPresetId("none");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (REQUIRED.some((k) => !form[k].trim())) {
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

    setSubmitting(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast({
        title: "خطأ",
        description: "انتهت الجلسة، يرجى تسجيل الدخول مجدداً",
        variant: "destructive",
      });
      setSubmitting(false);
      return;
    }

    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        broker_id: user.id,
        title: form.title.trim(),
        client_name: form.client_name.trim(),
        client_phone: form.client_phone.trim(),
        specialisation_id: Number(form.specialisation_id),
        grade_id: Number(form.grade_id),
        criteria_id: Number(form.criteria_id),
        unit_title: form.unit_title.trim(),
        assignment_name: form.assignment_name.trim(),
        total_price: price,
        deadline: new Date(form.deadline).toISOString(),
      })
      .select("id")
      .single();

    if (error || !order) {
      toast({
        title: "تعذر إنشاء الطلب",
        description: error?.message ?? "حدث خطأ غير متوقع",
        variant: "destructive",
      });
      setSubmitting(false);
      return;
    }

    await supabase.from("activity_logs").insert({
      order_id: order.id,
      actor_id: user.id,
      action: "create",
      details: `أنشأ الوسيط طلباً جديداً: ${form.title.trim()}`,
    });

    const subject =
      specialisations.find((s) => s.id === Number(form.specialisation_id))
        ?.name ?? "";
    const criteria =
      criteriaLevels.find((c) => c.id === Number(form.criteria_id))?.name ?? "";
    notifyTelegram(
      `📢 طلب BTEC جديد متاح بالسوق: ${escapeHtml(form.title.trim())} - ${escapeHtml(
        subject
      )} - ${escapeHtml(criteria)} - نصيب العامل: ${formatMoney(price * 0.8)} د.أ`
    );

    for (const file of files) {
      const path = `${order.id}/${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("order-attachments")
        .upload(path, file);

      if (uploadError) continue;

      const url = supabase.storage
        .from("order-attachments")
        .getPublicUrl(path).data.publicUrl;

      await supabase.from("order_attachments").insert({
        order_id: order.id,
        file_name: file.name,
        file_url: url,
        comment: comment.trim() || null,
      });
    }

    toast({
      title: "تم إنشاء الطلب",
      description: "تم نشر الطلب في السوق المفتوح",
    });
    reset();
    setSubmitting(false);
    onOpenChange(false);
    onCreated();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>إنشاء طلب جديد</DialogTitle>
          <DialogDescription>
            سيظهر الطلب في السوق المفتوح ليحجزه العمال.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field label="قالب BTEC (اختياري)">
            <Select
              value={presetId}
              onValueChange={(value) => {
                setPresetId(value);
                const preset = BTEC_PRESETS.find((p) => p.id === value);
                if (preset) applyPreset(preset);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر قالباً جاهزاً" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">بدون قالب</SelectItem>
                {BTEC_PRESETS.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="عنوان الطلب">
              <Input
                value={form.title}
                onChange={(e) => setField("title", e.target.value)}
                placeholder="مثال: تقرير وحدة إدارة الأعمال"
              />
            </Field>

            <Field label="التخصص">
              <Select
                value={form.specialisation_id}
                onValueChange={(v) => setField("specialisation_id", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر التخصص" />
                </SelectTrigger>
                <SelectContent>
                  {specialisations.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

            <Field label="المستوى">
              <Select
                value={form.grade_id}
                onValueChange={(v) => setField("grade_id", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر المستوى" />
                </SelectTrigger>
                <SelectContent>
                  {gradeLevels.map((g) => (
                    <SelectItem key={g.id} value={String(g.id)}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="المعيار (P/M/D)">
              <Select
                value={form.criteria_id}
                onValueChange={(v) => setField("criteria_id", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر المعيار" />
                </SelectTrigger>
                <SelectContent>
                  {criteriaLevels.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

          <div className="flex flex-col gap-2">
            <Label htmlFor="order-files">المرفقات</Label>
            <Input
              id="order-files"
              type="file"
              multiple
              onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
            />
            {files.length > 0 && (
              <ul className="flex flex-wrap gap-1.5">
                {files.map((f) => (
                  <li
                    key={`${f.name}-${f.size}`}
                    className="flex items-center gap-1 rounded-full bg-bone px-2 py-0.5 text-xs text-charcoal"
                  >
                    <Paperclip className="h-3 w-3" />
                    {f.name}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="order-comment">تعليق</Label>
            <Textarea
              id="order-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="ملاحظات إضافية (اختياري)"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              إلغاء
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <Loader2 className="animate-spin" />
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  نشر الطلب
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
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
