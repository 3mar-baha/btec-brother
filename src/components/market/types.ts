export interface MarketOrder {
  id: string;
  order_number: number;
  title: string;
  unit_title: string;
  assignment_name: string;
  specialisation_id: number;
  grade_id: number;
  criteria_id: number;
  total_price: number;
  worker_share: number;
  deadline: string;
  status: string;
  created_at: string;
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

export type Role = "admin" | "broker" | "worker";

export type Urgency = "all" | "urgent" | "week";

export interface MarketFilters {
  specialisationId: string;
  gradeId: string;
  criteriaId: string;
  urgency: Urgency;
}
