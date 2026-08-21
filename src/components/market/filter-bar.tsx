import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  Classification,
  CriteriaLevel,
  MarketFilters,
  Urgency,
} from "./types";

interface FilterBarProps {
  filters: MarketFilters;
  specialisations: Classification[];
  gradeLevels: Classification[];
  criteriaLevels: CriteriaLevel[];
  onChange: (filters: MarketFilters) => void;
}

function Field({
  label,
  value,
  onValueChange,
  children,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
      <span className="text-start text-xs font-medium text-muted-foreground">
        {label}
      </span>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>{children}</SelectContent>
      </Select>
    </div>
  );
}

export function FilterBar({
  filters,
  specialisations,
  gradeLevels,
  criteriaLevels,
  onChange,
}: FilterBarProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:flex sm:gap-4">
      <Field
        label="التخصص"
        value={filters.specialisationId}
        onValueChange={(v) => onChange({ ...filters, specialisationId: v })}
      >
        <SelectItem value="all">كل التخصصات</SelectItem>
        {specialisations.map((s) => (
          <SelectItem key={s.id} value={String(s.id)}>
            {s.name}
          </SelectItem>
        ))}
      </Field>

      <Field
        label="المستوى"
        value={filters.gradeId}
        onValueChange={(v) => onChange({ ...filters, gradeId: v })}
      >
        <SelectItem value="all">كل المستويات</SelectItem>
        {gradeLevels.map((g) => (
          <SelectItem key={g.id} value={String(g.id)}>
            {g.name}
          </SelectItem>
        ))}
      </Field>

      <Field
        label="المعيار"
        value={filters.criteriaId}
        onValueChange={(v) => onChange({ ...filters, criteriaId: v })}
      >
        <SelectItem value="all">كل المعايير</SelectItem>
        {criteriaLevels.map((c) => (
          <SelectItem key={c.id} value={String(c.id)}>
            {c.name}
          </SelectItem>
        ))}
      </Field>

      <Field
        label="الموعد النهائي"
        value={filters.urgency}
        onValueChange={(v) =>
          onChange({ ...filters, urgency: v as Urgency })
        }
      >
        <SelectItem value="all">كل المواعيد</SelectItem>
        <SelectItem value="urgent">عاجل (أقل من 48 ساعة)</SelectItem>
        <SelectItem value="week">هذا الأسبوع</SelectItem>
      </Field>
    </div>
  );
}
