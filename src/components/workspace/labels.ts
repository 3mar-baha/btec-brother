export const STATUS_LABELS: Record<string, string> = {
  open: "مفتوح",
  in_progress: "قيد التنفيذ",
  submitted: "بانتظار المراجعة",
  revision: "بحاجة لتعديل",
  completed: "مكتمل",
  cancelled: "ملغي",
};

export function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

export function statusBadgeClass(status: string): string {
  switch (status) {
    case "submitted":
      return "bg-brand/10 text-brand-pressed";
    case "completed":
      return "bg-success/10 text-success";
    case "revision":
      return "bg-ink/5 text-charcoal";
    default:
      return "bg-bone text-charcoal";
  }
}
