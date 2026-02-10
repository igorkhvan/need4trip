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
      admin_audit_log: {
        Row: {
          action_type: string
          actor_id: string
          actor_type: string
          created_at: string
          error_code: string | null
          id: number
          metadata: Json | null
          reason: string
          related_entity_id: string | null
          result: Database["public"]["Enums"]["admin_audit_result"]
          target_id: string
          target_type: string
        }
        Insert: {
          action_type: string
          actor_id: string
          actor_type?: string
          created_at?: string
          error_code?: string | null
          id?: number
          metadata?: Json | null
          reason: string
          related_entity_id?: string | null
          result: Database["public"]["Enums"]["admin_audit_result"]
          target_id: string
          target_type: string
        }
        Update: {
          action_type?: string
          actor_id?: string
          actor_type?: string
          created_at?: string
          error_code?: string | null
          id?: number
          metadata?: Json | null
          reason?: string
          related_entity_id?: string | null
          result?: Database["public"]["Enums"]["admin_audit_result"]
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      billing_credits: {
        Row: {
          consumed_at: string | null
          consumed_event_id: string | null
          created_at: string
          credit_code: string
          id: string
          source: string
          source_transaction_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          consumed_at?: string | null
          consumed_event_id?: string | null
          created_at?: string
          credit_code: string
          id?: string
          source?: string
          source_transaction_id: string
          status: string
          updated_at?: string
          user_id: string
        }
        Update: {
          consumed_at?: string | null
          consumed_event_id?: string | null
          created_at?: string
          credit_code?: string
          id?: string
          source?: string
          source_transaction_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_credits_consumed_event_id_fkey"
            columns: ["consumed_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_credits_credit_code_fkey"
            columns: ["credit_code"]
            isOneToOne: false
            referencedRelation: "billing_products"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "billing_credits_source_transaction_id_fkey"
            columns: ["source_transaction_id"]
            isOneToOne: false
            referencedRelation: "billing_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_credits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_credits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
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
      billing_products: {
        Row: {
          code: string
          constraints: Json
          created_at: string
          currency_code: string
          is_active: boolean
          price: number
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          code: string
          constraints?: Json
          created_at?: string
          currency_code?: string
          is_active?: boolean
          price: number
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          code?: string
          constraints?: Json
          created_at?: string
          currency_code?: string
          is_active?: boolean
          price?: number
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_products_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
        ]
      }
      billing_transactions: {
        Row: {
          amount: number
          club_id: string | null
          created_at: string
          currency_code: string
          id: string
          period_end: string | null
          period_start: string | null
          plan_id: string | null
          product_code: string
          provider: string
          provider_payment_id: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount: number
          club_id?: string | null
          created_at?: string
          currency_code: string
          id?: string
          period_end?: string | null
          period_start?: string | null
          plan_id?: string | null
          product_code: string
          provider: string
          provider_payment_id?: string | null
          status: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          club_id?: string | null
          created_at?: string
          currency_code?: string
          id?: string
          period_end?: string | null
          period_start?: string | null
          plan_id?: string | null
          product_code?: string
          provider?: string
          provider_payment_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
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
          {
            foreignKeyName: "billing_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_billing_transactions_currency"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
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
      club_audit_log: {
        Row: {
          action_code: string
          actor_user_id: string
          club_id: string
          created_at: string
          id: number
          meta: Json | null
          target_entity_id: string | null
          target_entity_type: string | null
          target_user_id: string | null
        }
        Insert: {
          action_code: string
          actor_user_id: string
          club_id: string
          created_at?: string
          id?: number
          meta?: Json | null
          target_entity_id?: string | null
          target_entity_type?: string | null
          target_user_id?: string | null
        }
        Update: {
          action_code?: string
          actor_user_id?: string
          club_id?: string
          created_at?: string
          id?: number
          meta?: Json | null
          target_entity_id?: string | null
          target_entity_type?: string | null
          target_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "club_audit_log_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "user_public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_audit_log_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_audit_log_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_audit_log_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "user_public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_audit_log_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
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
      club_invites: {
        Row: {
          club_id: string
          created_at: string
          expires_at: string
          id: string
          invited_by_user_id: string
          invitee_contact: string | null
          invitee_user_id: string | null
          status: Database["public"]["Enums"]["club_invite_status"]
          token: string | null
          updated_at: string
        }
        Insert: {
          club_id: string
          created_at?: string
          expires_at?: string
          id?: string
          invited_by_user_id: string
          invitee_contact?: string | null
          invitee_user_id?: string | null
          status?: Database["public"]["Enums"]["club_invite_status"]
          token?: string | null
          updated_at?: string
        }
        Update: {
          club_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          invited_by_user_id?: string
          invitee_contact?: string | null
          invitee_user_id?: string | null
          status?: Database["public"]["Enums"]["club_invite_status"]
          token?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_invites_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_invites_invited_by_user_id_fkey"
            columns: ["invited_by_user_id"]
            isOneToOne: false
            referencedRelation: "user_public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_invites_invited_by_user_id_fkey"
            columns: ["invited_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_invites_invitee_user_id_fkey"
            columns: ["invitee_user_id"]
            isOneToOne: false
            referencedRelation: "user_public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_invites_invitee_user_id_fkey"
            columns: ["invitee_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      club_join_requests: {
        Row: {
          club_id: string
          created_at: string
          expires_at: string | null
          id: string
          message: string | null
          requester_user_id: string
          status: Database["public"]["Enums"]["club_join_request_status"]
          updated_at: string
        }
        Insert: {
          club_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          message?: string | null
          requester_user_id: string
          status?: Database["public"]["Enums"]["club_join_request_status"]
          updated_at?: string
        }
        Update: {
          club_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          message?: string | null
          requester_user_id?: string
          status?: Database["public"]["Enums"]["club_join_request_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_join_requests_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_join_requests_requester_user_id_fkey"
            columns: ["requester_user_id"]
            isOneToOne: false
            referencedRelation: "user_public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_join_requests_requester_user_id_fkey"
            columns: ["requester_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      club_members: {
        Row: {
          club_id: string
          created_at: string
          invited_by: string | null
          joined_at: string
          role: Database["public"]["Enums"]["club_member_role"]
          user_id: string
        }
        Insert: {
          club_id: string
          created_at?: string
          invited_by?: string | null
          joined_at?: string
          role: Database["public"]["Enums"]["club_member_role"]
          user_id: string
        }
        Update: {
          club_id?: string
          created_at?: string
          invited_by?: string | null
          joined_at?: string
          role?: Database["public"]["Enums"]["club_member_role"]
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
            referencedRelation: "user_public_profiles"
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
            referencedRelation: "user_public_profiles"
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
          currency_code: string
          id: string
          is_public: boolean
          max_event_participants: number | null
          max_members: number | null
          price_monthly: number
          title: string
          updated_at: string
        }
        Insert: {
          allow_csv_export: boolean
          allow_paid_events: boolean
          created_at?: string
          currency?: string
          currency_code?: string
          id: string
          is_public?: boolean
          max_event_participants?: number | null
          max_members?: number | null
          price_monthly: number
          title: string
          updated_at?: string
        }
        Update: {
          allow_csv_export?: boolean
          allow_paid_events?: boolean
          created_at?: string
          currency?: string
          currency_code?: string
          id?: string
          is_public?: boolean
          max_event_participants?: number | null
          max_members?: number | null
          price_monthly?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_plans_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
        ]
      }
      club_subscription_entitlements: {
        Row: {
          club_id: string | null
          consumed_at: string | null
          created_at: string
          id: string
          plan_id: string
          status: string
          updated_at: string
          user_id: string
          valid_from: string
          valid_until: string
        }
        Insert: {
          club_id?: string | null
          consumed_at?: string | null
          created_at?: string
          id?: string
          plan_id: string
          status: string
          updated_at?: string
          user_id: string
          valid_from: string
          valid_until: string
        }
        Update: {
          club_id?: string | null
          consumed_at?: string | null
          created_at?: string
          id?: string
          plan_id?: string
          status?: string
          updated_at?: string
          user_id?: string
          valid_from?: string
          valid_until?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_subscription_entitlements_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: true
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_subscription_entitlements_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "club_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_subscription_entitlements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_subscription_entitlements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
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
          archived_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          logo_url: string | null
          name: string
          owner_user_id: string | null
          settings: Json
          slug: string
          telegram_url: string | null
          updated_at: string
          visibility: Database["public"]["Enums"]["club_visibility"]
          website_url: string | null
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          logo_url?: string | null
          name: string
          owner_user_id?: string | null
          settings?: Json
          slug: string
          telegram_url?: string | null
          updated_at?: string
          visibility?: Database["public"]["Enums"]["club_visibility"]
          website_url?: string | null
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          owner_user_id?: string | null
          settings?: Json
          slug?: string
          telegram_url?: string | null
          updated_at?: string
          visibility?: Database["public"]["Enums"]["club_visibility"]
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clubs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clubs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clubs_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "user_public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clubs_owner_user_id_fkey"
            columns: ["owner_user_id"]
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
      event_locations: {
        Row: {
          created_at: string | null
          event_id: string
          id: string
          latitude: number | null
          longitude: number | null
          raw_input: string | null
          sort_order: number
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          event_id: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          raw_input?: string | null
          sort_order: number
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          event_id?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          raw_input?: string | null
          sort_order?: number
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_locations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "user_public_profiles"
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
            referencedRelation: "user_public_profiles"
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
          allow_anonymous_registration: boolean
          category: string | null
          category_id: string | null
          city_id: string
          club_id: string | null
          created_at: string
          created_by_user_id: string | null
          currency: string | null
          currency_code: string | null
          custom_fields_schema: Json
          date_time: string
          deleted_at: string | null
          description: string
          id: string
          is_club_event: boolean
          is_paid: boolean
          max_participants: number | null
          price: number | null
          registration_manually_closed: boolean
          rules: string | null
          slug: string
          title: string
          updated_at: string
          vehicle_type_requirement: string
          version: number
          visibility: string
        }
        Insert: {
          allow_anonymous_registration?: boolean
          category?: string | null
          category_id?: string | null
          city_id: string
          club_id?: string | null
          created_at?: string
          created_by_user_id?: string | null
          currency?: string | null
          currency_code?: string | null
          custom_fields_schema?: Json
          date_time: string
          deleted_at?: string | null
          description: string
          id?: string
          is_club_event?: boolean
          is_paid?: boolean
          max_participants?: number | null
          price?: number | null
          registration_manually_closed?: boolean
          rules?: string | null
          slug: string
          title: string
          updated_at?: string
          vehicle_type_requirement?: string
          version?: number
          visibility?: string
        }
        Update: {
          allow_anonymous_registration?: boolean
          category?: string | null
          category_id?: string | null
          city_id?: string
          club_id?: string | null
          created_at?: string
          created_by_user_id?: string | null
          currency?: string | null
          currency_code?: string | null
          custom_fields_schema?: Json
          date_time?: string
          deleted_at?: string | null
          description?: string
          id?: string
          is_club_event?: boolean
          is_paid?: boolean
          max_participants?: number | null
          price?: number | null
          registration_manually_closed?: boolean
          rules?: string | null
          slug?: string
          title?: string
          updated_at?: string
          vehicle_type_requirement?: string
          version?: number
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
            referencedRelation: "user_public_profiles"
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
      feedback: {
        Row: {
          created_at: string
          id: string
          message: string
          page_path: string | null
          type: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          page_path?: string | null
          type: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          page_path?: string | null
          type?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      idempotency_keys: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          key: string
          response_body: Json | null
          response_status: number | null
          route: string
          status: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          key: string
          response_body?: Json | null
          response_status?: number | null
          route: string
          status: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          key?: string
          response_body?: Json | null
          response_status?: number | null
          route?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_logs: {
        Row: {
          error_message: string | null
          event_id: string
          id: string
          message: string
          sent_at: string | null
          status: Database["public"]["Enums"]["notification_status"]
          trigger_type: Database["public"]["Enums"]["notification_trigger"]
          user_id: string
        }
        Insert: {
          error_message?: string | null
          event_id: string
          id?: string
          message: string
          sent_at?: string | null
          status: Database["public"]["Enums"]["notification_status"]
          trigger_type: Database["public"]["Enums"]["notification_trigger"]
          user_id: string
        }
        Update: {
          error_message?: string | null
          event_id?: string
          id?: string
          message?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          trigger_type?: Database["public"]["Enums"]["notification_trigger"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_queue: {
        Row: {
          attempts: number | null
          created_at: string | null
          dedupe_key: string | null
          event_id: string
          id: string
          last_error: string | null
          locked_at: string | null
          locked_by: string | null
          max_attempts: number | null
          message: string
          moved_to_dlq_at: string | null
          payload: Json | null
          scheduled_for: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["notification_status"] | null
          telegram_chat_id: string
          trigger_type: Database["public"]["Enums"]["notification_trigger"]
          user_id: string
        }
        Insert: {
          attempts?: number | null
          created_at?: string | null
          dedupe_key?: string | null
          event_id: string
          id?: string
          last_error?: string | null
          locked_at?: string | null
          locked_by?: string | null
          max_attempts?: number | null
          message: string
          moved_to_dlq_at?: string | null
          payload?: Json | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"] | null
          telegram_chat_id: string
          trigger_type: Database["public"]["Enums"]["notification_trigger"]
          user_id: string
        }
        Update: {
          attempts?: number | null
          created_at?: string | null
          dedupe_key?: string | null
          event_id?: string
          id?: string
          last_error?: string | null
          locked_at?: string | null
          locked_by?: string | null
          max_attempts?: number | null
          message?: string
          moved_to_dlq_at?: string | null
          payload?: Json | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"] | null
          telegram_chat_id?: string
          trigger_type?: Database["public"]["Enums"]["notification_trigger"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_queue_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_queue_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_queue_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
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
            referencedRelation: "user_public_profiles"
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
      user_notification_settings: {
        Row: {
          created_at: string | null
          is_telegram_enabled: boolean | null
          notify_event_cancelled: boolean | null
          notify_event_reminder: boolean | null
          notify_event_updated: boolean | null
          notify_new_event_published: boolean | null
          notify_new_participant_joined: boolean | null
          notify_organizer_message: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          is_telegram_enabled?: boolean | null
          notify_event_cancelled?: boolean | null
          notify_event_reminder?: boolean | null
          notify_event_updated?: boolean | null
          notify_new_event_published?: boolean | null
          notify_new_participant_joined?: boolean | null
          notify_organizer_message?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          is_telegram_enabled?: boolean | null
          notify_event_cancelled?: boolean | null
          notify_event_reminder?: boolean | null
          notify_event_updated?: boolean | null
          notify_new_event_published?: boolean | null
          notify_new_participant_joined?: boolean | null
          notify_organizer_message?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notification_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_notification_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
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
          status: string
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
          status?: string
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
          status?: string
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
      billing_transaction_summaries: {
        Row: {
          club_id: string | null
          club_name: string | null
          currency_code: string | null
          first_transaction: string | null
          last_transaction: string | null
          plan_id: string | null
          total_amount: number | null
          transaction_count: number | null
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
          {
            foreignKeyName: "fk_billing_transactions_currency"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
        ]
      }
      club_subscription_limits: {
        Row: {
          club_id: string | null
          is_active: boolean | null
          is_expired: boolean | null
          max_events: number | null
          plan_id: string | null
          status: string | null
        }
        Insert: {
          club_id?: string | null
          is_active?: never
          is_expired?: never
          max_events?: never
          plan_id?: string | null
          status?: string | null
        }
        Update: {
          club_id?: string | null
          is_active?: never
          is_expired?: never
          max_events?: never
          plan_id?: string | null
          status?: string | null
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
      user_public_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          experience_level: string | null
          id: string | null
          name: string | null
          telegram_handle: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          experience_level?: string | null
          id?: string | null
          name?: string | null
          telegram_handle?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          experience_level?: string | null
          id?: string | null
          name?: string | null
          telegram_handle?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_view_club_subscription: {
        Args: { p_club_id: string }
        Returns: boolean
      }
      claim_pending_notifications: {
        Args: { p_batch_size: number; p_worker_id: string }
        Returns: {
          attempts: number | null
          created_at: string | null
          dedupe_key: string | null
          event_id: string
          id: string
          last_error: string | null
          locked_at: string | null
          locked_by: string | null
          max_attempts: number | null
          message: string
          moved_to_dlq_at: string | null
          payload: Json | null
          scheduled_for: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["notification_status"] | null
          telegram_chat_id: string
          trigger_type: Database["public"]["Enums"]["notification_trigger"]
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "notification_queue"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      cleanup_old_idempotency_keys: { Args: never; Returns: undefined }
      create_club_consuming_entitlement: {
        Args: {
          p_city_ids?: string[]
          p_description?: string
          p_logo_url?: string
          p_name: string
          p_telegram_url?: string
          p_user_id: string
          p_website_url?: string
        }
        Returns: {
          archived_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          logo_url: string | null
          name: string
          owner_user_id: string | null
          settings: Json
          slug: string
          telegram_url: string | null
          updated_at: string
          visibility: Database["public"]["Enums"]["club_visibility"]
          website_url: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "clubs"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      create_club_invite: {
        Args: {
          p_club_id: string
          p_invited_by_user_id: string
          p_invitee_user_id: string
        }
        Returns: {
          club_id: string
          created_at: string
          expires_at: string
          id: string
          invited_by_user_id: string
          invitee_contact: string | null
          invitee_user_id: string | null
          status: Database["public"]["Enums"]["club_invite_status"]
          token: string | null
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "club_invites"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      deactivate_expired_club_subscriptions: { Args: never; Returns: undefined }
      get_club_city_ids: { Args: { p_club_id: string }; Returns: string[] }
      get_club_total_revenue: { Args: { p_club_id: string }; Returns: number }
      get_club_transaction_count: {
        Args: { p_club_id: string }
        Returns: number
      }
      get_event_locations_count: {
        Args: { p_event_id: string }
        Returns: number
      }
      move_to_dead_letter_queue: {
        Args: { p_error_message: string; p_notification_id: string }
        Returns: undefined
      }
      reset_stuck_notifications: {
        Args: { p_timeout_minutes?: number }
        Returns: number
      }
      update_club_cities: {
        Args: { p_city_ids: string[]; p_club_id: string }
        Returns: undefined
      }
    }
    Enums: {
      admin_audit_result: "success" | "rejected"
      club_invite_status: "pending" | "accepted" | "expired" | "cancelled"
      club_join_request_status:
        | "pending"
        | "approved"
        | "rejected"
        | "cancelled"
        | "expired"
      club_member_role: "owner" | "admin" | "member" | "pending"
      club_visibility: "public" | "private"
      notification_status:
        | "pending"
        | "processing"
        | "sent"
        | "failed"
        | "cancelled"
      notification_trigger:
        | "event_updated"
        | "new_event_published"
        | "new_participant_joined"
        | "event_cancelled"
        | "event_reminder"
        | "organizer_message"
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
    Enums: {
      admin_audit_result: ["success", "rejected"],
      club_invite_status: ["pending", "accepted", "expired", "cancelled"],
      club_join_request_status: [
        "pending",
        "approved",
        "rejected",
        "cancelled",
        "expired",
      ],
      club_member_role: ["owner", "admin", "member", "pending"],
      club_visibility: ["public", "private"],
      notification_status: [
        "pending",
        "processing",
        "sent",
        "failed",
        "cancelled",
      ],
      notification_trigger: [
        "event_updated",
        "new_event_published",
        "new_participant_joined",
        "event_cancelled",
        "event_reminder",
        "organizer_message",
      ],
    },
  },
} as const
