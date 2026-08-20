export interface ActivityLog {
  id: string;
  order_id: string | null;
  actor_id: string;
  action: string;
  details: string | null;
  created_at: string;
}

export interface LogUser {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

export interface LogOrder {
  id: string;
  order_number: number;
}

export interface EnrichedLog extends ActivityLog {
  actorName: string;
  actorAvatar: string | null;
  orderNumber: number | null;
}
