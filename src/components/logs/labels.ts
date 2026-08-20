export const ACTION_LABELS: Record<string, string> = {
  create: "إنشاء",
  claim: "حجز",
  drop: "تنازل",
  daily_update: "تحديث يومي",
  submit: "تسليم",
  revision: "طلب تعديل",
  approve: "اكتمال",
  settle: "تسوية مالية",
};

export const ACTION_ORDER: string[] = [
  "create",
  "claim",
  "drop",
  "daily_update",
  "submit",
  "revision",
  "approve",
  "settle",
];

export function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

export function actionBadgeClass(action: string): string {
  switch (action) {
    case "claim":
      return "bg-brand/10 text-brand-pressed";
    case "drop":
      return "bg-destructive/10 text-destructive";
    case "approve":
    case "settle":
      return "bg-success/10 text-success";
    default:
      return "bg-bone text-charcoal";
  }
}
