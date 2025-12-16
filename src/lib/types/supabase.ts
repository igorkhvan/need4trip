export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      billing_policy: {
        Row: {
          created_at: string
          grace_period_days: number
          id: string
          pending_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          grace_period_days?: number
          id: string
          pending_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          grace_period_days?: number
          id?: string
          pending_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      billing_policy_actions: {
        Row: {
          action: string
          is_allowed: boolean
          policy_id: string
          status: string
        }
        Insert: {
          action: string
          is_allowed?: boolean
          policy_id: string
          status: string
        }
        Update: {
          action?: string
          is_allowed?: boolean
          policy_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_policy_actions_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "billing_policy"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_transactions: {
        Row: {
          amount_kzt: number
          club_id: string
          created_at: string
          currency: string
          id: string
          period_end: string | null
          period_start: string | null
          plan_id: string
          provider: string
          provider_payment_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount_kzt: number
          club_id: string
          created_at?: string
          currency?: string
          id?: string
          period_end?: string | null
          period_start?: string | null
          plan_id: string
          provider: string
          provider_payment_id?: string | null
          status: string
          updated_at?: string
        }
        Update: {
          amount_kzt?: number
          club_id?: string
          created_at?: string
          currency?: string
          id?: string
          period_end?: string | null
          period_start?: string | null
          plan_id?: string
          provider?: string
          provider_payment_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_transactions_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_transactions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "club_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      car_brands: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string | null
        }
        Relationships: []
      }
      cities: {
        Row: {
          country: string
          created_at: string
          id: string
          is_popular: boolean | null
          lat: number | null
          lng: number | null
          name: string
          name_en: string | null
          population: number | null
          region: string | null
          updated_at: string
        }
        Insert: {
          country?: string
          created_at?: string
          id?: string
          is_popular?: boolean | null
          lat?: number | null
          lng?: number | null
          name: string
          name_en?: string | null
          population?: number | null
          region?: string | null
          updated_at?: string
        }
        Update: {
          country?: string
          created_at?: string
          id?: string
          is_popular?: boolean | null
          lat?: number | null
          lng?: number | null
          name?: string
          name_en?: string | null
          population?: number | null
          region?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      club_cities: {
        Row: {
          city_id: string
          club_id: string
          created_at: string
        }
        Insert: {
          city_id: string
          club_id: string
          created_at?: string
        }
        Update: {
          city_id?: string
          club_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_cities_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_cities_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      club_members: {
        Row: {
          club_id: string
          invited_by: string | null
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          club_id: string
          invited_by?: string | null
          joined_at?: string
          role: string
          user_id: string
        }
        Update: {
          club_id?: string
          invited_by?: string | null
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_members_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_members_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      club_plans: {
        Row: {
          allow_csv_export: boolean
          allow_paid_events: boolean
          created_at: string
          currency: string
          id: string
          is_public: boolean
          max_event_participants: number | null
          max_members: number | null
          price_monthly_kzt: number
          title: string
          updated_at: string
        }
        Insert: {
          allow_csv_export: boolean
          allow_paid_events: boolean
          created_at?: string
          currency?: string
          id: string
          is_public?: boolean
          max_event_participants?: number | null
          max_members?: number | null
          price_monthly_kzt: number
          title: string
          updated_at?: string
        }
        Update: {
          allow_csv_export?: boolean
          allow_paid_events?: boolean
          created_at?: string
          currency?: string
          id?: string
          is_public?: boolean
          max_event_participants?: number | null
          max_members?: number | null
          price_monthly_kzt?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      club_subscriptions: {
        Row: {
          club_id: string
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          grace_until: string | null
          plan_id: string
          status: string
          updated_at: string
        }
        Insert: {
          club_id: string
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          grace_until?: string | null
          plan_id: string
          status: string
          updated_at?: string
        }
        Update: {
          club_id?: string
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          grace_until?: string | null
          plan_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_subscriptions_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: true
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "club_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      clubs: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          logo_url: string | null
          name: string
          telegram_url: string | null
          updated_at: string
          website_url: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          logo_url?: string | null
          name: string
          telegram_url?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          telegram_url?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clubs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      currencies: {
        Row: {
          code: string
          created_at: string
          decimal_places: number | null
          is_active: boolean | null
          name_en: string | null
          name_ru: string
          sort_order: number
          symbol: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          decimal_places?: number | null
          is_active?: boolean | null
          name_en?: string | null
          name_ru: string
          sort_order?: number
          symbol: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          decimal_places?: number | null
          is_active?: boolean | null
          name_en?: string | null
          name_ru?: string
          sort_order?: number
          symbol?: string
          updated_at?: string
        }
        Relationships: []
      }
      event_allowed_brands: {
        Row: {
          brand_id: string
          event_id: string
        }
        Insert: {
          brand_id: string
          event_id: string
        }
        Update: {
          brand_id?: string
          event_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_allowed_brands_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "car_brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_allowed_brands_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_categories: {
        Row: {
          code: string
          created_at: string
          display_order: number
          icon: string
          id: string
          is_active: boolean
          is_default: boolean
          name_en: string
          name_ru: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          display_order?: number
          icon: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          name_en: string
          name_ru: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          display_order?: number
          icon?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          name_en?: string
          name_ru?: string
          updated_at?: string
        }
        Relationships: []
      }
      event_participants: {
        Row: {
          created_at: string
          custom_field_values: Json
          display_name: string
          event_id: string
          guest_session_id: string | null
          id: string
          role: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          custom_field_values?: Json
          display_name: string
          event_id: string
          guest_session_id?: string | null
          id?: string
          role: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          custom_field_values?: Json
          display_name?: string
          event_id?: string
          guest_session_id?: string | null
          id?: string
          role?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_participants_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      event_user_access: {
        Row: {
          created_at: string
          event_id: string
          id: string
          source: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          source: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          source?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_user_access_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_user_access_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          category: string | null
          category_id: string | null
          city_id: string | null
          club_id: string | null
          created_at: string
          created_by_user_id: string | null
          currency: string | null
          currency_code: string | null
          custom_fields_schema: Json
          date_time: string
          description: string
          id: string
          is_club_event: boolean
          is_paid: boolean
          location_lat: number | null
          location_lng: number | null
          location_text: string
          max_participants: number | null
          price: number | null
          rules: string | null
          title: string
          updated_at: string
          vehicle_type_requirement: string
          visibility: string
        }
        Insert: {
          category?: string | null
          category_id?: string | null
          city_id?: string | null
          club_id?: string | null
          created_at?: string
          created_by_user_id?: string | null
          currency?: string | null
          currency_code?: string | null
          custom_fields_schema?: Json
          date_time: string
          description: string
          id?: string
          is_club_event?: boolean
          is_paid?: boolean
          location_lat?: number | null
          location_lng?: number | null
          location_text: string
          max_participants?: number | null
          price?: number | null
          rules?: string | null
          title: string
          updated_at?: string
          vehicle_type_requirement?: string
          visibility?: string
        }
        Update: {
          category?: string | null
          category_id?: string | null
          city_id?: string | null
          club_id?: string | null
          created_at?: string
          created_by_user_id?: string | null
          currency?: string | null
          currency_code?: string | null
          custom_fields_schema?: Json
          date_time?: string
          description?: string
          id?: string
          is_club_event?: boolean
          is_paid?: boolean
          location_lat?: number | null
          location_lng?: number | null
          location_text?: string
          max_participants?: number | null
          price?: number | null
          rules?: string | null
          title?: string
          updated_at?: string
          vehicle_type_requirement?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "event_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
        ]
      }
      user_cars: {
        Row: {
          car_brand_id: string
          color: string | null
          created_at: string
          id: string
          is_primary: boolean
          plate: string | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          car_brand_id: string
          color?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean
          plate?: string | null
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          car_brand_id?: string
          color?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean
          plate?: string | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_cars_car_brand_id_fkey"
            columns: ["car_brand_id"]
            isOneToOne: false
            referencedRelation: "car_brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_cars_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          bio: string | null
          car_brand_id: string | null
          car_model: string | null
          car_model_text: string | null
          city_id: string | null
          created_at: string
          email: string | null
          experience_level: string | null
          id: string
          name: string
          phone: string | null
          plan: string
          telegram_handle: string | null
          telegram_id: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          car_brand_id?: string | null
          car_model?: string | null
          car_model_text?: string | null
          city_id?: string | null
          created_at?: string
          email?: string | null
          experience_level?: string | null
          id?: string
          name: string
          phone?: string | null
          plan?: string
          telegram_handle?: string | null
          telegram_id?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          car_brand_id?: string | null
          car_model?: string | null
          car_model_text?: string | null
          city_id?: string | null
          created_at?: string
          email?: string | null
          experience_level?: string | null
          id?: string
          name?: string
          phone?: string | null
          plan?: string
          telegram_handle?: string | null
          telegram_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_car_brand_id_fkey"
            columns: ["car_brand_id"]
            isOneToOne: false
            referencedRelation: "car_brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_types: {
        Row: {
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          name_en: string
          name_ru: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id: string
          is_active?: boolean
          name_en: string
          name_ru: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          name_en?: string
          name_ru?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      deactivate_expired_club_subscriptions: { Args: never; Returns: undefined }
      get_club_city_ids: { Args: { p_club_id: string }; Returns: string[] }
      update_club_cities: {
        Args: { p_city_ids: string[]; p_club_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
