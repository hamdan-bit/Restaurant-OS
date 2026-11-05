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
    PostgrestVersion: "14.18"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json
          restaurant_id: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json
          restaurant_id?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json
          restaurant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      manager_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          full_name: string
          id: string
          invited_by: string
          invited_user_id: string | null
          preset: string
          restaurant_id: string
          revoked_at: string | null
          status: Database["public"]["Enums"]["manager_invitation_status"]
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          full_name: string
          id?: string
          invited_by: string
          invited_user_id?: string | null
          preset?: string
          restaurant_id: string
          revoked_at?: string | null
          status?: Database["public"]["Enums"]["manager_invitation_status"]
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          full_name?: string
          id?: string
          invited_by?: string
          invited_user_id?: string | null
          preset?: string
          restaurant_id?: string
          revoked_at?: string | null
          status?: Database["public"]["Enums"]["manager_invitation_status"]
        }
        Relationships: [
          {
            foreignKeyName: "manager_invitations_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_published: boolean
          name: string
          restaurant_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          name: string
          restaurant_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          name?: string
          restaurant_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_categories_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          category_id: string
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_available: boolean
          is_published: boolean
          name: string
          price: number
          restaurant_id: string
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          is_published?: boolean
          name: string
          price: number
          restaurant_id: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          is_published?: boolean
          name?: string
          price?: number
          restaurant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "menu_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_items_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          event_type: string
          id: string
          read_at: string | null
          recipient_user_id: string
          restaurant_id: string | null
          title: string
        }
        Insert: {
          body: string
          created_at?: string
          event_type: string
          id?: string
          read_at?: string | null
          recipient_user_id: string
          restaurant_id?: string | null
          title: string
        }
        Update: {
          body?: string
          created_at?: string
          event_type?: string
          id?: string
          read_at?: string | null
          recipient_user_id?: string
          restaurant_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          item_name: string
          line_total: number
          menu_item_id: string
          order_id: string
          quantity: number
          restaurant_id: string
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          item_name: string
          line_total: number
          menu_item_id: string
          order_id: string
          quantity: number
          restaurant_id: string
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          item_name?: string
          line_total?: number
          menu_item_id?: string
          order_id?: string
          quantity?: number
          restaurant_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          accepted_at: string | null
          completed_at: string | null
          created_at: string
          customer_name: string | null
          customer_phone: string | null
          id: string
          notes: string | null
          order_reference: string
          order_type: Database["public"]["Enums"]["order_type"]
          restaurant_id: string
          seat_id: string | null
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          table_id: string | null
          total: number
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          completed_at?: string | null
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          notes?: string | null
          order_reference: string
          order_type: Database["public"]["Enums"]["order_type"]
          restaurant_id: string
          seat_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          table_id?: string | null
          total?: number
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          completed_at?: string | null
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          notes?: string | null
          order_reference?: string
          order_type?: Database["public"]["Enums"]["order_type"]
          restaurant_id?: string
          seat_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          table_id?: string | null
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_seat_id_fkey"
            columns: ["seat_id"]
            isOneToOne: false
            referencedRelation: "seats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "restaurant_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_webhook_events: {
        Row: {
          event_status: string
          id: string
          payload: Json
          payment_id: string | null
          processed_at: string
          provider_event_id: string
          provider_reference: string | null
        }
        Insert: {
          event_status: string
          id?: string
          payload?: Json
          payment_id?: string | null
          processed_at?: string
          provider_event_id: string
          provider_reference?: string | null
        }
        Update: {
          event_status?: string
          id?: string
          payload?: Json
          payment_id?: string | null
          processed_at?: string
          provider_event_id?: string
          provider_reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_webhook_events_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          confirmed_at: string | null
          created_at: string
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          order_id: string
          provider_reference: string | null
          restaurant_id: string
          status: Database["public"]["Enums"]["payment_status"]
        }
        Insert: {
          amount: number
          confirmed_at?: string | null
          created_at?: string
          id?: string
          method: Database["public"]["Enums"]["payment_method"]
          order_id: string
          provider_reference?: string | null
          restaurant_id: string
          status?: Database["public"]["Enums"]["payment_status"]
        }
        Update: {
          amount?: number
          confirmed_at?: string | null
          created_at?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          order_id?: string
          provider_reference?: string | null
          restaurant_id?: string
          status?: Database["public"]["Enums"]["payment_status"]
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          code: string
          description: string
          id: string
        }
        Insert: {
          code: string
          description: string
          id?: string
        }
        Update: {
          code?: string
          description?: string
          id?: string
        }
        Relationships: []
      }
      plan_entitlements: {
        Row: {
          enabled: boolean
          feature_code: string
          limit_value: number | null
          plan_id: string
        }
        Insert: {
          enabled?: boolean
          feature_code: string
          limit_value?: number | null
          plan_id: string
        }
        Update: {
          enabled?: boolean
          feature_code?: string
          limit_value?: number | null
          plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_entitlements_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_role_permissions: {
        Row: {
          permission_id: string
          role: Database["public"]["Enums"]["platform_role"]
        }
        Insert: {
          permission_id: string
          role: Database["public"]["Enums"]["platform_role"]
        }
        Update: {
          permission_id?: string
          role?: Database["public"]["Enums"]["platform_role"]
        }
        Relationships: [
          {
            foreignKeyName: "platform_role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_users: {
        Row: {
          created_at: string
          is_active: boolean
          role: Database["public"]["Enums"]["platform_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          is_active?: boolean
          role: Database["public"]["Enums"]["platform_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["platform_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      qr_codes: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          restaurant_id: string
          revoked_at: string | null
          seat_id: string | null
          table_id: string | null
          token_hash: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          restaurant_id: string
          revoked_at?: string | null
          seat_id?: string | null
          table_id?: string | null
          token_hash: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          restaurant_id?: string
          revoked_at?: string | null
          seat_id?: string | null
          table_id?: string | null
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "qr_codes_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qr_codes_seat_id_fkey"
            columns: ["seat_id"]
            isOneToOne: false
            referencedRelation: "seats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qr_codes_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "restaurant_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      registration_applications: {
        Row: {
          applicant_user_id: string
          business_name: string
          contact_email: string
          contact_phone: string | null
          created_at: string
          decision_reason: string | null
          id: string
          owner_name: string
          public_slug: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["application_status"]
          updated_at: string
        }
        Insert: {
          applicant_user_id: string
          business_name: string
          contact_email: string
          contact_phone?: string | null
          created_at?: string
          decision_reason?: string | null
          id?: string
          owner_name: string
          public_slug: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
        }
        Update: {
          applicant_user_id?: string
          business_name?: string
          contact_email?: string
          contact_phone?: string | null
          created_at?: string
          decision_reason?: string | null
          id?: string
          owner_name?: string
          public_slug?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
        }
        Relationships: []
      }
      restaurant_tables: {
        Row: {
          capacity: number
          created_at: string
          id: string
          is_active: boolean
          name: string
          restaurant_id: string
        }
        Insert: {
          capacity?: number
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          restaurant_id: string
        }
        Update: {
          capacity?: number
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_tables_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurants: {
        Row: {
          address: string | null
          created_at: string
          currency: string
          id: string
          logo_url: string | null
          name: string
          owner_user_id: string | null
          phone: string | null
          public_slug: string
          settings: Json
          status: Database["public"]["Enums"]["restaurant_status"]
          timezone: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          currency?: string
          id?: string
          logo_url?: string | null
          name: string
          owner_user_id?: string | null
          phone?: string | null
          public_slug: string
          settings?: Json
          status?: Database["public"]["Enums"]["restaurant_status"]
          timezone?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          currency?: string
          id?: string
          logo_url?: string | null
          name?: string
          owner_user_id?: string | null
          phone?: string | null
          public_slug?: string
          settings?: Json
          status?: Database["public"]["Enums"]["restaurant_status"]
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          permission_id: string
          role_id: string
        }
        Insert: {
          permission_id: string
          role_id: string
        }
        Update: {
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          id: string
          name: string
          preset: string | null
          restaurant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          preset?: string | null
          restaurant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          preset?: string | null
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "roles_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      seats: {
        Row: {
          id: string
          is_active: boolean
          name: string
          restaurant_id: string
          table_id: string
        }
        Insert: {
          id?: string
          is_active?: boolean
          name: string
          restaurant_id: string
          table_id: string
        }
        Update: {
          id?: string
          is_active?: boolean
          name?: string
          restaurant_id?: string
          table_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seats_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seats_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "restaurant_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_invoices: {
        Row: {
          amount: number
          created_at: string
          currency: string
          due_at: string | null
          id: string
          paid_at: string | null
          provider_reference: string | null
          status: string
          subscription_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          due_at?: string | null
          id?: string
          paid_at?: string | null
          provider_reference?: string | null
          status?: string
          subscription_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          due_at?: string | null
          id?: string
          paid_at?: string | null
          provider_reference?: string | null
          status?: string
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_invoices_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_payments: {
        Row: {
          amount: number
          confirmed_at: string | null
          created_at: string
          currency: string
          id: string
          invoice_id: string
          provider_reference: string | null
          status: Database["public"]["Enums"]["payment_status"]
        }
        Insert: {
          amount: number
          confirmed_at?: string | null
          created_at?: string
          currency?: string
          id?: string
          invoice_id: string
          provider_reference?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
        }
        Update: {
          amount?: number
          confirmed_at?: string | null
          created_at?: string
          currency?: string
          id?: string
          invoice_id?: string
          provider_reference?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
        }
        Relationships: [
          {
            foreignKeyName: "subscription_payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "subscription_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          annual_price: number
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          monthly_price: number
          name: string
        }
        Insert: {
          annual_price?: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          monthly_price?: number
          name: string
        }
        Update: {
          annual_price?: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          monthly_price?: number
          name?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancelled_at: string | null
          created_at: string
          current_period_end: string | null
          id: string
          plan_id: string
          provider_reference: string | null
          restaurant_id: string
          starts_at: string
          status: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan_id: string
          provider_reference?: string | null
          restaurant_id: string
          starts_at?: string
          status: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan_id?: string
          provider_reference?: string | null
          restaurant_id?: string
          starts_at?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          restaurant_id: string
          role_id: string
          user_id: string
        }
        Insert: {
          restaurant_id: string
          role_id: string
          user_id: string
        }
        Update: {
          restaurant_id?: string
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_public_restaurant: {
        Args: { restaurant_slug: string }
        Returns: {
          address: string | null
          currency: string
          id: string
          logo_url: string | null
          name: string
          phone: string | null
          public_slug: string
          status: Database["public"]["Enums"]["restaurant_status"]
        }[]
      }
      accept_manager_invitation: {
        Args: { invitation_id: string }
        Returns: string
      }
      approve_registration_application: {
        Args: {
          application_id: string
          selected_plan_id?: string
          trial_days?: number
        }
        Returns: string
      }
      create_manager_invitation: {
        Args: {
          manager_email: string
          manager_name: string
          manager_preset?: string
          target_restaurant_id: string
        }
        Returns: string
      }
      create_public_order: {
        Args: {
          requested_customer_name?: string
          requested_customer_phone?: string
          requested_items: Json
          requested_notes?: string
          requested_order_type: Database["public"]["Enums"]["order_type"]
          requested_qr_token?: string
          requested_seat_id?: string
          requested_table_id?: string
          restaurant_slug: string
        }
        Returns: {
          order_id: string
          order_reference: string
          order_total: number
          payment_required: boolean
        }[]
      }
      create_registration_application: {
        Args: {
          business_name: string
          contact_email: string
          contact_phone?: string
          owner_name: string
          public_slug: string
        }
        Returns: string
      }
      has_tenant_permission: {
        Args: { required_permission: string; target_restaurant_id: string }
        Returns: boolean
      }
      is_order_owner: { Args: { target_order_id: string }; Returns: boolean }
      is_platform_user: {
        Args: { required_role?: Database["public"]["Enums"]["platform_role"] }
        Returns: boolean
      }
      is_tenant_member: {
        Args: { target_restaurant_id: string }
        Returns: boolean
      }
      mark_manager_invitation_failed: {
        Args: { invitation_id: string }
        Returns: undefined
      }
      reconcile_remote_payment: {
        Args: {
          order_reference_value: string
          webhook_amount: number
          webhook_currency: string
          webhook_event_id: string
          webhook_payload?: Json
          webhook_provider_reference: string
          webhook_status: string
        }
        Returns: {
          already_processed: boolean
          order_id: string
          order_status: Database["public"]["Enums"]["order_status"]
          payment_id: string
          payment_status: Database["public"]["Enums"]["payment_status"]
        }[]
      }
      reject_registration_application: {
        Args: { application_id: string; reason: string }
        Returns: undefined
      }
      request_registration_information: {
        Args: { application_id: string; reason: string }
        Returns: undefined
      }
      revoke_manager_invitation: {
        Args: { invitation_id: string }
        Returns: undefined
      }
      submit_registration_application: {
        Args: { application_id: string }
        Returns: undefined
      }
    }
    Enums: {
      application_status:
        | "PENDING_VERIFICATION"
        | "PENDING_APPROVAL"
        | "MORE_INFORMATION_REQUIRED"
        | "APPROVED"
        | "REJECTED"
      manager_invitation_status: "PENDING" | "ACCEPTED" | "REVOKED" | "EXPIRED"
      order_status:
        | "RECEIVED"
        | "ACCEPTED"
        | "PREPARING"
        | "READY"
        | "SERVED"
        | "COLLECTED"
        | "REJECTED"
        | "CANCELLED"
      order_type: "DINE_IN" | "REMOTE"
      payment_method: "CASH" | "MOBILE_MONEY" | "CARD" | "OTHER"
      payment_status: "PENDING" | "CONFIRMED" | "FAILED" | "REFUNDED"
      platform_role: "SUPER_ADMIN" | "PLATFORM_ADMIN" | "SUPPORT_STAFF"
      restaurant_role: "OWNER" | "MANAGER"
      restaurant_status: "PENDING_SETUP" | "ACTIVE" | "SUSPENDED" | "CLOSED"
      subscription_status:
        | "TRIAL"
        | "ACTIVE"
        | "PAST_DUE"
        | "GRACE_PERIOD"
        | "SUSPENDED"
        | "CANCELLED"
        | "EXPIRED"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      application_status: [
        "PENDING_VERIFICATION",
        "PENDING_APPROVAL",
        "MORE_INFORMATION_REQUIRED",
        "APPROVED",
        "REJECTED",
      ],
      manager_invitation_status: ["PENDING", "ACCEPTED", "REVOKED", "EXPIRED"],
      order_status: [
        "RECEIVED",
        "ACCEPTED",
        "PREPARING",
        "READY",
        "SERVED",
        "COLLECTED",
        "REJECTED",
        "CANCELLED",
      ],
      order_type: ["DINE_IN", "REMOTE"],
      payment_method: ["CASH", "MOBILE_MONEY", "CARD", "OTHER"],
      payment_status: ["PENDING", "CONFIRMED", "FAILED", "REFUNDED"],
      platform_role: ["SUPER_ADMIN", "PLATFORM_ADMIN", "SUPPORT_STAFF"],
      restaurant_role: ["OWNER", "MANAGER"],
      restaurant_status: ["PENDING_SETUP", "ACTIVE", "SUSPENDED", "CLOSED"],
      subscription_status: [
        "TRIAL",
        "ACTIVE",
        "PAST_DUE",
        "GRACE_PERIOD",
        "SUSPENDED",
        "CANCELLED",
        "EXPIRED",
      ],
    },
  },
} as const
