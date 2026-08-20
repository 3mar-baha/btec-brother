/**
 * Database type definitions for BTEC Hub.
 *
 * Mirrors `supabase/schema.sql`. `users` and `orders` follow docs/05-DATA-MODEL.md
 * exactly; the remaining tables were designed to match the ER overview and
 * docs/06-API-SPECIFICATION.md (the docs do not provide column-level detail
 * for them). Regenerate with `supabase gen types` once the DB is live to
 * capture any drift from the actual migrations.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          role: Database["public"]["Enums"]["user_role"];
          phone_number: string | null;
          avatar_url: string | null;
          is_active: boolean;
          is_approved: boolean;
          requested_role: Database["public"]["Enums"]["user_role"];
          telegram_chat_id: number | null;
          telegram_username: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          full_name: string;
          role?: Database["public"]["Enums"]["user_role"];
          phone_number?: string | null;
          avatar_url?: string | null;
          is_active?: boolean;
          is_approved?: boolean;
          requested_role?: Database["public"]["Enums"]["user_role"];
          telegram_chat_id?: number | null;
          telegram_username?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          role?: Database["public"]["Enums"]["user_role"];
          phone_number?: string | null;
          avatar_url?: string | null;
          is_active?: boolean;
          is_approved?: boolean;
          requested_role?: Database["public"]["Enums"]["user_role"];
          telegram_chat_id?: number | null;
          telegram_username?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      specialisations: {
        Row: {
          id: number;
          name: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: number;
          name: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: number;
          name?: string;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      grade_levels: {
        Row: {
          id: number;
          name: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: number;
          name: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: number;
          name?: string;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      criteria_levels: {
        Row: {
          id: number;
          code: string;
          name: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: number;
          code: string;
          name: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: number;
          code?: string;
          name?: string;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      orders: {
        Row: {
          id: string;
          order_number: number;
          broker_id: string;
          worker_id: string | null;
          title: string;
          client_name: string;
          client_phone: string;
          specialisation_id: number;
          grade_id: number;
          criteria_id: number;
          unit_title: string;
          assignment_name: string;
          total_price: number;
          worker_share: number;
          broker_share: number;
          deadline: string;
          status: Database["public"]["Enums"]["order_status"];
          completed_at: string | null;
          submission_url: string | null;
          plagiarism_rate: number | null;
          ai_percentage: number | null;
          revision_notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_number?: number;
          broker_id: string;
          worker_id?: string | null;
          title: string;
          client_name: string;
          client_phone: string;
          specialisation_id: number;
          grade_id: number;
          criteria_id: number;
          unit_title: string;
          assignment_name: string;
          total_price: number;
          deadline: string;
          status?: Database["public"]["Enums"]["order_status"];
          completed_at?: string | null;
          submission_url?: string | null;
          plagiarism_rate?: number | null;
          ai_percentage?: number | null;
          revision_notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_number?: number;
          broker_id?: string;
          worker_id?: string | null;
          title?: string;
          client_name?: string;
          client_phone?: string;
          specialisation_id?: number;
          grade_id?: number;
          criteria_id?: number;
          unit_title?: string;
          assignment_name?: string;
          total_price?: number;
          deadline?: string;
          status?: Database["public"]["Enums"]["order_status"];
          completed_at?: string | null;
          submission_url?: string | null;
          plagiarism_rate?: number | null;
          ai_percentage?: number | null;
          revision_notes?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      order_attachments: {
        Row: {
          id: string;
          order_id: string;
          file_name: string;
          file_url: string;
          comment: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          file_name: string;
          file_url: string;
          comment?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          file_name?: string;
          file_url?: string;
          comment?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      daily_updates: {
        Row: {
          id: string;
          order_id: string;
          author_id: string;
          note: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          author_id?: string;
          note: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          author_id?: string;
          note?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      activity_logs: {
        Row: {
          id: string;
          order_id: string | null;
          actor_id: string;
          action: string;
          details: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id?: string | null;
          actor_id: string;
          action: string;
          details?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string | null;
          actor_id?: string;
          action?: string;
          details?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      reviews: {
        Row: {
          id: string;
          order_id: string;
          reviewer_id: string;
          rating: number | null;
          comment: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          reviewer_id: string;
          rating?: number | null;
          comment?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          reviewer_id?: string;
          rating?: number | null;
          comment?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      payouts: {
        Row: {
          id: string;
          order_id: string;
          user_id: string;
          amount: number;
          share_type: Database["public"]["Enums"]["share_type"];
          status: Database["public"]["Enums"]["payout_status"];
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          user_id: string;
          amount: number;
          share_type: Database["public"]["Enums"]["share_type"];
          status?: Database["public"]["Enums"]["payout_status"];
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          user_id?: string;
          amount?: number;
          share_type?: Database["public"]["Enums"]["share_type"];
          status?: Database["public"]["Enums"]["payout_status"];
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      claim_order: {
        Args: { p_order_id: string };
        Returns: {
          success: boolean;
          message: string;
          order_id: string;
          status: string;
        } | null;
      };
      drop_order: {
        Args: { p_order_id: string; p_reason?: string };
        Returns: {
          success: boolean;
          message: string;
          order_id: string;
          status: string;
        } | null;
      };
      submit_order_solution: {
        Args: {
          p_order_id: string;
          p_submission_url: string;
          p_plagiarism_rate?: number | null;
          p_ai_percentage?: number | null;
        };
        Returns: {
          success: boolean;
          message: string;
          order_id: string;
          status: string;
        } | null;
      };
      request_revision: {
        Args: { p_order_id: string; p_revision_notes: string };
        Returns: {
          success: boolean;
          message: string;
          order_id: string;
          status: string;
        } | null;
      };
      approve_and_complete_order: {
        Args: { p_order_id: string };
        Returns: {
          success: boolean;
          message: string;
          order_id: string;
          status: string;
        } | null;
      };
      settle_payout: {
        Args: { p_user_id: string; p_note?: string | null };
        Returns: {
          success: boolean;
          message: string;
          settled_count: number;
          settled_amount: number;
        } | null;
      };
      approve_user: {
        Args: {
          p_user_id: string;
          p_role?: Database["public"]["Enums"]["user_role"] | null;
        };
        Returns: {
          success: boolean;
          message: string;
        } | null;
      };
      reject_user: {
        Args: { p_user_id: string };
        Returns: {
          success: boolean;
          message: string;
        } | null;
      };
      directory_stats: {
        Args: Record<PropertyKey, never>;
        Returns: {
          members: Array<{
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
          }>;
          matrix: Array<{
            worker_id: string;
            worker_name: string;
            broker_id: string;
            broker_name: string;
            count: number;
          }>;
        } | null;
      };
      is_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
    };
    Enums: {
      user_role: "admin" | "broker" | "worker";
      order_status:
        | "open"
        | "in_progress"
        | "submitted"
        | "revision"
        | "completed"
        | "cancelled";
      payout_status: "pending" | "settled";
      share_type: "worker" | "broker";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
