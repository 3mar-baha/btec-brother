export interface DirectoryMember {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role: string;
  is_active: boolean;
  completed: number;
  active: number;
  earnings: number;
  avg_days: number;
  on_time: number;
  precise: number;
  urgent: number;
}

export interface CollaborationRow {
  worker_id: string;
  worker_name: string;
  broker_id: string;
  broker_name: string;
  count: number;
}
