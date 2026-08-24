"use client";

import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  Activity,
  BrokerOption,
  Classification,
  CriteriaLevel,
  SortKey,
} from "./types";

interface FilterBarProps {
  q: string;
  gradeId: string;
  criteriaCode: string;
  school: string;
  specId: string;
  brokerId: string;
  activity: Activity;
  sort: SortKey;
  gradeLevels: Classification[];
  specialisations: Classification[];
  criteriaLevels: CriteriaLevel[];
  schools: string[];
  brokers: BrokerOption[];
  isAdmin: boolean;
  hasActiveFilters: boolean;
  onQ: (q: string) => void;
  onFilter: (patch: Record<string, string>) => void;
  onReset: () => void;
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className="text-start text-xs font-medium text-muted-foreground">
        {label}
      </span>
      {children}
    </div>
  );
}

export function ClientsFilterBar({
  q,
  gradeId,
  criteriaCode,
  school,
  specId,
  brokerId,
  activity,
  sort,
  gradeLevels,
  specialisations,
  criteriaLevels,
  schools,
  brokers,
  isAdmin,
  hasActiveFilters,
  onQ,
  onFilter,
  onReset,
}: FilterBarProps) {
  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <Input
          value={q}
          onChange={(e) => onQ(e.target.value)}
          placeholder="بحث بالاسم أو الهاتف أو المدرسة…"
          className="h-9"
        />
        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={onReset}
            className="shrink-0 gap-1"
          >
            <X className="h-3.5 w-3.5" />
            مسح
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Field label="الصف">
          <Select
            value={gradeId}
            onValueChange={(v) => onFilter({ grade: v })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الصفوف</SelectItem>
              {gradeLevels.map((g) => (
                <SelectItem key={g.id} value={String(g.id)}>
                  {g.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="المعيار الأكاديمي">
          <Select
            value={criteriaCode}
            onValueChange={(v) => onFilter({ criteria: v })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل المعايير</SelectItem>
              {criteriaLevels.map((c) => (
                <SelectItem key={c.id} value={c.code}>
                  {c.code} — {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="المدرسة">
          <Select value={school} onValueChange={(v) => onFilter({ school: v })}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل المدارس</SelectItem>
              {schools.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="التخصص">
          <Select value={specId} onValueChange={(v) => onFilter({ spec: v })}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل التخصصات</SelectItem>
              {specialisations.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        {isAdmin && (
          <Field label="الوسيط المسؤول">
            <Select
              value={brokerId}
              onValueChange={(v) => onFilter({ broker: v })}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الوسطاء</SelectItem>
                {brokers.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}

        <Field label="حالة النشاط">
          <Select
            value={activity}
            onValueChange={(v) => onFilter({ activity: v })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل العملاء</SelectItem>
              <SelectItem value="active">لديه طلبات جارية</SelectItem>
              <SelectItem value="revision">طلبات تحت التعديل</SelectItem>
              <SelectItem value="completed">مكتمل فقط</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field label="الترتيب">
          <Select value={sort} onValueChange={(v) => onFilter({ sort: v })}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">الأحدث نشاطاً</SelectItem>
              <SelectItem value="spending">الأكثر إنفاقاً</SelectItem>
              <SelectItem value="orders">الأكثر طلباً</SelectItem>
              <SelectItem value="alpha">أبجدياً</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>
    </div>
  );
}
