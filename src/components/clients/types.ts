export interface ClientOrder {
  id: string;
  order_number: number;
  broker_id: string;
  title: string;
  unit_title: string;
  assignment_name: string;
  client_name: string;
  client_phone: string;
  client_school: string | null;
  specialisation_id: number;
  grade_id: number;
  criteria_id: number;
  total_price: number;
  deadline: string;
  status: string;
  created_at: string;
  completed_at: string | null;
}

export interface Classification {
  id: number;
  name: string;
}

export interface CriteriaLevel {
  id: number;
  code: string;
  name: string;
}

export interface BrokerOption {
  id: string;
  full_name: string;
}

export type Activity = "all" | "active" | "revision" | "completed";
export type SortKey = "recent" | "spending" | "orders" | "alpha";

/** URL-synced filters; "all"/"" means the dimension is inactive. */
export interface ClientFilters {
  q: string;
  gradeId: string;
  criteriaCode: string;
  school: string;
  specId: string;
  brokerId: string;
  activity: Activity;
  sort: SortKey;
}

export const DEFAULT_FILTERS: ClientFilters = {
  q: "",
  gradeId: "all",
  criteriaCode: "all",
  school: "all",
  specId: "all",
  brokerId: "all",
  activity: "all",
  sort: "recent",
};

export interface ClientAggregate {
  key: string;
  name: string;
  phone: string;
  schools: string[];
  gradeIds: number[];
  orders: ClientOrder[];
  totalOrders: number;
  activeOrders: number;
  totalValue: number;
  lastOrderAt: string;
}

export interface ClientStats {
  totalClients: number;
  totalSchools: number;
  activeOrders: number;
  topSchool: string | null;
}
