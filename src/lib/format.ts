export function formatMoney(amount: number): string {
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("ar", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export interface Countdown {
  label: string;
  urgent: boolean;
  overdue: boolean;
}

export function relativeTime(iso: string, now: Date = new Date()): string {
  const diff = now.getTime() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "الآن";
  if (minutes < 60) return `منذ ${minutes} دقيقة`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `منذ ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  return `منذ ${days} يوم`;
}

export function countdown(deadline: string, now: Date = new Date()): Countdown {
  const diff = new Date(deadline).getTime() - now.getTime();
  const overdue = diff < 0;
  const abs = Math.abs(diff);

  const days = Math.floor(abs / 86_400_000);
  const hours = Math.floor((abs % 86_400_000) / 3_600_000);
  const minutes = Math.floor((abs % 3_600_000) / 60_000);

  let label: string;
  if (days > 0) label = `${days} يوم`;
  else if (hours > 0) label = `${hours} ساعة`;
  else label = `${minutes} دقيقة`;

  label = overdue ? `متأخر ${label}` : `باقي ${label}`;

  return { label, urgent: !overdue && diff < 48 * 3_600_000, overdue };
}
