import type {
  Classification,
  CriteriaLevel,
} from "@/components/market/types";

export interface WorkspaceOrder {
  id: string;
  order_number: number;
  broker_id: string;
  worker_id: string | null;
  title: string;
  specialisation_id: number;
  grade_id: number;
  criteria_id: number;
  unit_title: string;
  assignment_name: string;
  total_price: number;
  worker_share: number;
  broker_share: number;
  deadline: string;
  status: string;
  submission_url: string | null;
  plagiarism_rate: number | null;
  ai_percentage: number | null;
  revision_notes: string | null;
  created_at: string;
}

export interface Attachment {
  id: string;
  order_id: string;
  file_name: string;
  file_url: string;
  comment: string | null;
  created_at: string;
}

export interface DailyUpdate {
  id: string;
  order_id: string;
  author_id: string;
  note: string;
  created_at: string;
}

export interface WorkerProfile {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

export type { Classification, CriteriaLevel };
