export interface FinancialSummary {
  grossRevenue: number;
  workerEarnings: number;
  brokerCommissions: number;
  pendingPayouts: number;
  settledPayouts: number;
}

export interface LedgerRow {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role: string;
  completedTasks: number;
  pendingBalance: number;
  totalPaid: number;
}

export interface TransactionRow {
  id: string;
  member_name: string;
  role: string;
  order_number: number | null;
  share_type: string;
  amount: number;
  status: string;
  created_at: string;
}

export interface Category {
  id: number;
  name: string;
  code?: string | null;
  is_active: boolean;
}

export interface StuckOrder {
  id: string;
  order_number: number;
  title: string;
  worker_id: string | null;
  worker_name: string | null;
  deadline: string;
  status: string;
}

export interface ManagedUser {
  id: string;
  email: string;
  full_name: string;
  phone_number: string | null;
  role: string;
  is_active: boolean;
  is_approved: boolean;
  requested_role: string;
  created_at: string;
}
