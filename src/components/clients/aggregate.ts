import type {
  ClientAggregate,
  ClientFilters,
  ClientOrder,
  ClientStats,
} from "./types";

const ACTIVE_STATUSES = new Set(["open", "in_progress", "submitted"]);

/** Stable identity for a client: normalized phone, falling back to name. */
export function phoneKey(phone: string, name: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits || `name:${name.trim().toLowerCase()}`;
}

// ponytail: assumes Jordanian local numbers ("07…") — wa.me needs "962…" prefix.
// Extend the prefix table if clients outside Jordan show up.
export function whatsappHref(phone: string): string {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = `962${digits.slice(1)}`;
  return `https://wa.me/${digits}`;
}

function orderMatches(
  order: ClientOrder,
  f: ClientFilters,
  criteriaCodeById: Map<number, string>
): boolean {
  if (f.gradeId !== "all" && order.grade_id !== Number(f.gradeId)) return false;

  if (f.criteriaCode !== "all") {
    if (criteriaCodeById.get(order.criteria_id) !== f.criteriaCode) return false;
  }

  if (f.school !== "all" && order.client_school !== f.school) return false;
  if (f.specId !== "all" && order.specialisation_id !== Number(f.specId)) {
    return false;
  }
  if (f.brokerId !== "all" && order.broker_id !== f.brokerId) return false;

  switch (f.activity) {
    case "active":
      if (!ACTIVE_STATUSES.has(order.status)) return false;
      break;
    case "revision":
      if (order.status !== "revision") return false;
      break;
    case "completed":
      if (order.status !== "completed") return false;
      break;
  }

  const needle = f.q.trim().toLowerCase();
  if (needle) {
    const haystack =
      `${order.client_name} ${order.client_phone} ${order.client_school ?? ""}`.toLowerCase();
    if (!haystack.includes(needle)) return false;
  }

  return true;
}

export function aggregateClient(key: string, orders: ClientOrder[]): ClientAggregate {
  const schools = new Set<string>();
  const gradeIds = new Set<number>();
  let totalValue = 0;
  let lastOrderAt = orders[0].created_at;

  for (const o of orders) {
    if (o.client_school) schools.add(o.client_school);
    gradeIds.add(o.grade_id);
    totalValue += Number(o.total_price);
    if (o.created_at > lastOrderAt) lastOrderAt = o.created_at;
  }

  return {
    key,
    name: orders[0].client_name,
    phone: orders[0].client_phone,
    schools: Array.from(schools),
    gradeIds: Array.from(gradeIds),
    orders,
    totalOrders: orders.length,
    activeOrders: orders.filter((o) => ACTIVE_STATUSES.has(o.status)).length,
    totalValue,
    lastOrderAt,
  };
}

/**
 * Filters orders per `f`, groups them into clients, sorts and computes stats.
 * All figures reflect the filtered view so KPI cards stay in sync with the
 * active filters. `orders` must be sorted by created_at descending.
 */
export function buildClients(
  orders: ClientOrder[],
  f: ClientFilters,
  criteriaCodeById: Map<number, string>
): { clients: ClientAggregate[]; stats: ClientStats } {
  const filtered = orders.filter((o) => orderMatches(o, f, criteriaCodeById));

  const byKey = new Map<string, ClientOrder[]>();
  for (const o of filtered) {
    const key = phoneKey(o.client_phone, o.client_name);
    const group = byKey.get(key);
    if (group) group.push(o);
    else byKey.set(key, [o]);
  }

  const clients: ClientAggregate[] = [];
  byKey.forEach((os, key) => clients.push(aggregateClient(key, os)));

  switch (f.sort) {
    case "spending":
      clients.sort((a, b) => b.totalValue - a.totalValue);
      break;
    case "orders":
      clients.sort((a, b) => b.totalOrders - a.totalOrders);
      break;
    case "alpha":
      clients.sort((a, b) => a.name.localeCompare(b.name, "ar"));
      break;
    default:
      clients.sort((a, b) => b.lastOrderAt.localeCompare(a.lastOrderAt));
  }

  const schoolCounts = new Map<string, number>();
  for (const o of filtered) {
    if (!o.client_school) continue;
    schoolCounts.set(o.client_school, (schoolCounts.get(o.client_school) ?? 0) + 1);
  }
  let topSchool: string | null = null;
  let topCount = 0;
  schoolCounts.forEach((count, school) => {
    if (count > topCount) {
      topSchool = school;
      topCount = count;
    }
  });

  const stats: ClientStats = {
    totalClients: clients.length,
    totalSchools: schoolCounts.size,
    activeOrders: filtered.filter((o) => ACTIVE_STATUSES.has(o.status)).length,
    topSchool,
  };

  return { clients, stats };
}
