export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      event_user_access: {
        Row: {
          id: string
          event_id: string
          user_id: string
          source: "owner" | "participant" | "link"
          created_at: string
        }
        Insert: {
          id?: string
          event_id: string
          user_id: string
          source: "owner" | "participant" | "link"
          created_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          user_id?: string
          source?: "owner" | "participant" | "link"
          created_at?: string
        }
      }
      user_cars: {
        Row: {
          id: string
          user_id: string
          car_brand_id: string
          type: string
          plate: string | null
          color: string | null
          is_primary: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          car_brand_id: string
          type: string
          plate?: string | null
          color?: string | null
          is_primary?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          car_brand_id?: string
          type?: string
          plate?: string | null
          color?: string | null
          is_primary?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      users: {
        Row: {
          id: string
          telegram_id: string
          username: string | null
          first_name: string | null
          last_name: string | null
          avatar_url: string | null
          name: string | null
          city_id: string | null
          phone: string | null
          bio: string | null
          car_brand_id: string | null
          car_model_text: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          telegram_id: string
          username?: string | null
          first_name?: string | null
          last_name?: string | null
          avatar_url?: string | null
          name?: string | null
          city_id?: string | null
          phone?: string | null
          bio?: string | null
          car_brand_id?: string | null
          car_model_text?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          telegram_id?: string
          username?: string | null
          first_name?: string | null
          last_name?: string | null
          avatar_url?: string | null
          name?: string | null
          city_id?: string | null
          phone?: string | null
          bio?: string | null
          car_brand_id?: string | null
          car_model_text?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      [key: string]: any
    }
  }
}

