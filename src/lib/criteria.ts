export function criteriaBadgeClass(code: string): string {
  if (code === "D") return "bg-brand/10 text-brand-pressed";
  if (code === "M") return "bg-bone text-charcoal";
  return "bg-success/10 text-success";
}
