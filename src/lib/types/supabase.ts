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
          name: string;
          phone: string | null;
          email: string | null;
          telegram_handle: string | null;
          telegram_id: string | null;
          avatar_url: string | null;
          car_model: string | null;
          experience_level: "beginner" | "intermediate" | "pro" | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          phone?: string | null;
          email?: string | null;
          telegram_handle?: string | null;
          telegram_id?: string | null;
          avatar_url?: string | null;
          car_model?: string | null;
          experience_level?: "beginner" | "intermediate" | "pro" | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          phone?: string | null;
          email?: string | null;
          telegram_handle?: string | null;
          telegram_id?: string | null;
          avatar_url?: string | null;
          car_model?: string | null;
          experience_level?: "beginner" | "intermediate" | "pro" | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      events: {
        Row: {
          id: string;
          title: string;
          description: string;
          category: string | null;
          date_time: string;
          location_text: string;
          location_lat: number | null;
          location_lng: number | null;
          max_participants: number | null;
          custom_fields_schema: Json;
          created_by_user_id: string | null;
          visibility: string;
          vehicle_type_requirement: string;
          rules: string | null;
          is_club_event: boolean;
          is_paid: boolean;
          price: number | null;
          currency: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description: string;
          category?: string | null;
          date_time: string;
          location_text: string;
          location_lat?: number | null;
          location_lng?: number | null;
          max_participants?: number | null;
          custom_fields_schema?: Json;
          created_by_user_id?: string | null;
          visibility?: string;
          vehicle_type_requirement?: string;
          rules?: string | null;
          is_club_event?: boolean;
          is_paid?: boolean;
          price?: number | null;
          currency?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          category?: string | null;
          date_time?: string;
          location_text?: string;
          location_lat?: number | null;
          location_lng?: number | null;
          max_participants?: number | null;
          custom_fields_schema?: Json;
          created_by_user_id?: string | null;
          visibility?: string;
          vehicle_type_requirement?: string;
          rules?: string | null;
          is_club_event?: boolean;
          is_paid?: boolean;
          price?: number | null;
          currency?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "events_created_by_user_id_fkey";
            columns: ["created_by_user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      event_participants: {
        Row: {
          id: string;
          event_id: string;
          user_id: string | null;
          guest_session_id: string | null;
          display_name: string;
          role: string;
          custom_field_values: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          user_id?: string | null;
          guest_session_id?: string | null;
          display_name: string;
          role: string;
          custom_field_values?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          user_id?: string | null;
          guest_session_id?: string | null;
          display_name?: string;
          role?: string;
          custom_field_values?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "event_participants_event_id_fkey";
            columns: ["event_id"];
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "event_participants_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      car_brands: {
        Row: {
          id: string;
          name: string;
          slug: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      event_allowed_brands: {
        Row: {
          event_id: string;
          brand_id: string;
        };
        Insert: {
          event_id: string;
          brand_id: string;
        };
        Update: {
          event_id?: string;
          brand_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "event_allowed_brands_brand_id_fkey";
            columns: ["brand_id"];
            referencedRelation: "car_brands";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "event_allowed_brands_event_id_fkey";
            columns: ["event_id"];
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      event_user_access: {
        Row: {
          id: string;
          event_id: string;
          user_id: string;
          source: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          user_id: string;
          source: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          user_id?: string;
          source?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "event_user_access_event_id_fkey";
            columns: ["event_id"];
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "event_user_access_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
