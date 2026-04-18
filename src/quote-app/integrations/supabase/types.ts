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
      abandoned_bookings: {
        Row: {
          affiliate_click_id: string | null
          affiliate_code_id: string | null
          affiliate_id: string | null
          created_at: string
          customer_email: string
          customer_name: string
          customer_phone: string | null
          deposit_amount: number | null
          event_date: string
          guest_count: number
          id: string
          last_step: string
          package_type: string | null
          party_type: string
          quote_url: string | null
          quoted_amount: number | null
          selected_boat_name: string | null
          selected_time_end: string | null
          selected_time_start: string | null
          status: string
          ticket_count: number | null
          time_slot_id: string | null
          updated_at: string
        }
        Insert: {
          affiliate_click_id?: string | null
          affiliate_code_id?: string | null
          affiliate_id?: string | null
          created_at?: string
          customer_email: string
          customer_name: string
          customer_phone?: string | null
          deposit_amount?: number | null
          event_date: string
          guest_count: number
          id?: string
          last_step?: string
          package_type?: string | null
          party_type: string
          quote_url?: string | null
          quoted_amount?: number | null
          selected_boat_name?: string | null
          selected_time_end?: string | null
          selected_time_start?: string | null
          status?: string
          ticket_count?: number | null
          time_slot_id?: string | null
          updated_at?: string
        }
        Update: {
          affiliate_click_id?: string | null
          affiliate_code_id?: string | null
          affiliate_id?: string | null
          created_at?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string | null
          deposit_amount?: number | null
          event_date?: string
          guest_count?: number
          id?: string
          last_step?: string
          package_type?: string | null
          party_type?: string
          quote_url?: string | null
          quoted_amount?: number | null
          selected_boat_name?: string | null
          selected_time_end?: string | null
          selected_time_start?: string | null
          status?: string
          ticket_count?: number | null
          time_slot_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "abandoned_bookings_affiliate_click_id_fkey"
            columns: ["affiliate_click_id"]
            isOneToOne: false
            referencedRelation: "affiliate_clicks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abandoned_bookings_affiliate_code_id_fkey"
            columns: ["affiliate_code_id"]
            isOneToOne: false
            referencedRelation: "affiliate_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abandoned_bookings_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_time_slot"
            columns: ["time_slot_id"]
            isOneToOne: false
            referencedRelation: "time_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_password_reset_tokens: {
        Row: {
          created_at: string | null
          email: string
          expires_at: string
          id: string
          token: string
          used: boolean
        }
        Insert: {
          created_at?: string | null
          email: string
          expires_at?: string
          id?: string
          token?: string
          used?: boolean
        }
        Update: {
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          token?: string
          used?: boolean
        }
        Relationships: []
      }
      admin_profiles: {
        Row: {
          created_at: string | null
          email: string
          id: string
          partner_display_name: string | null
          partner_name: string | null
          password_hash: string
          role: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          partner_display_name?: string | null
          partner_name?: string | null
          password_hash?: string
          role?: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          partner_display_name?: string | null
          partner_name?: string | null
          password_hash?: string
          role?: string
        }
        Relationships: []
      }
      affiliate_clicks: {
        Row: {
          affiliate_id: string
          clicked_at: string
          component_type: string
          id: string
          ip_address: string | null
          referrer_url: string | null
          source_url: string | null
          user_agent: string | null
        }
        Insert: {
          affiliate_id: string
          clicked_at?: string
          component_type: string
          id?: string
          ip_address?: string | null
          referrer_url?: string | null
          source_url?: string | null
          user_agent?: string | null
        }
        Update: {
          affiliate_id?: string
          clicked_at?: string
          component_type?: string
          id?: string
          ip_address?: string | null
          referrer_url?: string | null
          source_url?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_clicks_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_codes: {
        Row: {
          active: boolean
          affiliate_id: string
          code: string
          commission_rate: number
          created_at: string
          id: string
          updated_at: string
          usage_count: number
        }
        Insert: {
          active?: boolean
          affiliate_id: string
          code: string
          commission_rate?: number
          created_at?: string
          id?: string
          updated_at?: string
          usage_count?: number
        }
        Update: {
          active?: boolean
          affiliate_id?: string
          code?: string
          commission_rate?: number
          created_at?: string
          id?: string
          updated_at?: string
          usage_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_codes_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_conversions: {
        Row: {
          affiliate_id: string
          booking_amount: number | null
          booking_id: string | null
          click_id: string | null
          commission_amount: number
          commission_rate: number
          component_type: string
          conversion_type: string
          created_at: string
          id: string
          lead_id: string | null
          paid_out_at: string | null
          status: string
        }
        Insert: {
          affiliate_id: string
          booking_amount?: number | null
          booking_id?: string | null
          click_id?: string | null
          commission_amount?: number
          commission_rate: number
          component_type: string
          conversion_type: string
          created_at?: string
          id?: string
          lead_id?: string | null
          paid_out_at?: string | null
          status?: string
        }
        Update: {
          affiliate_id?: string
          booking_amount?: number | null
          booking_id?: string | null
          click_id?: string | null
          commission_amount?: number
          commission_rate?: number
          component_type?: string
          conversion_type?: string
          created_at?: string
          id?: string
          lead_id?: string | null
          paid_out_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_conversions_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_conversions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_conversions_click_id_fkey"
            columns: ["click_id"]
            isOneToOne: false
            referencedRelation: "affiliate_clicks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_conversions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_payouts: {
        Row: {
          affiliate_id: string
          amount: number
          conversion_ids: string[]
          created_at: string
          id: string
          notes: string | null
          processed_at: string | null
          status: string
          stripe_transfer_id: string | null
        }
        Insert: {
          affiliate_id: string
          amount: number
          conversion_ids?: string[]
          created_at?: string
          id?: string
          notes?: string | null
          processed_at?: string | null
          status?: string
          stripe_transfer_id?: string | null
        }
        Update: {
          affiliate_id?: string
          amount?: number
          conversion_ids?: string[]
          created_at?: string
          id?: string
          notes?: string | null
          processed_at?: string | null
          status?: string
          stripe_transfer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_payouts_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliates: {
        Row: {
          affiliate_code: string
          available_balance: number
          commission_rate: number
          company_name: string | null
          contact_name: string
          created_at: string
          email: string
          id: string
          notes: string | null
          payout_threshold: number
          phone: string | null
          status: string
          stripe_connect_account_id: string | null
          total_earnings: number
          total_paid_out: number
          updated_at: string
          user_id: string | null
          venmo_id: string | null
        }
        Insert: {
          affiliate_code: string
          available_balance?: number
          commission_rate?: number
          company_name?: string | null
          contact_name: string
          created_at?: string
          email: string
          id?: string
          notes?: string | null
          payout_threshold?: number
          phone?: string | null
          status?: string
          stripe_connect_account_id?: string | null
          total_earnings?: number
          total_paid_out?: number
          updated_at?: string
          user_id?: string | null
          venmo_id?: string | null
        }
        Update: {
          affiliate_code?: string
          available_balance?: number
          commission_rate?: number
          company_name?: string | null
          contact_name?: string
          created_at?: string
          email?: string
          id?: string
          notes?: string | null
          payout_threshold?: number
          phone?: string | null
          status?: string
          stripe_connect_account_id?: string | null
          total_earnings?: number
          total_paid_out?: number
          updated_at?: string
          user_id?: string | null
          venmo_id?: string | null
        }
        Relationships: []
      }
      ai_chatbot_config: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      ai_test_conversations: {
        Row: {
          created_at: string
          id: string
          messages: Json
          name: string
          notes: string | null
          rating: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          messages?: Json
          name?: string
          notes?: string | null
          rating?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          messages?: Json
          name?: string
          notes?: string | null
          rating?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      audit_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          payload: Json | null
          ref_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          payload?: Json | null
          ref_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json | null
          ref_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      boat_experiences: {
        Row: {
          boat_id: string
          capacity_override: number | null
          created_at: string
          experience_id: string
          id: string
          price_override: number | null
        }
        Insert: {
          boat_id: string
          capacity_override?: number | null
          created_at?: string
          experience_id: string
          id?: string
          price_override?: number | null
        }
        Update: {
          boat_id?: string
          capacity_override?: number | null
          created_at?: string
          experience_id?: string
          id?: string
          price_override?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "boat_experiences_boat_id_fkey"
            columns: ["boat_id"]
            isOneToOne: false
            referencedRelation: "boats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boat_experiences_experience_id_fkey"
            columns: ["experience_id"]
            isOneToOne: false
            referencedRelation: "experiences"
            referencedColumns: ["id"]
          },
        ]
      }
      boats: {
        Row: {
          boat_group: string | null
          capacity: number
          created_at: string
          id: string
          images: string[] | null
          location: string | null
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          boat_group?: string | null
          capacity: number
          created_at?: string
          id?: string
          images?: string[] | null
          location?: string | null
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          boat_group?: string | null
          capacity?: number
          created_at?: string
          id?: string
          images?: string[] | null
          location?: string | null
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      booking_tags: {
        Row: {
          booking_id: string
          created_at: string
          id: string
          tag_id: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          id?: string
          tag_id: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_tags_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          affiliate_click_id: string | null
          affiliate_code_id: string | null
          affiliate_id: string | null
          alcohol_delivery_url: string | null
          amount: number
          amount_paid: number | null
          canceled_at: string | null
          confirmed_at: string | null
          created_at: string
          currency: string
          customer_id: string
          deposit_amount: number
          headcount: number
          held_until: string | null
          id: string
          invoice_sent_at: string | null
          notes: string | null
          package_type: string
          party_type: string
          payment_plan: string | null
          promo_code: string | null
          source_type: string | null
          source_url: string | null
          status: string
          stripe_invoice_id: string | null
          stripe_invoice_url: string | null
          stripe_payment_intent_id: string | null
          time_slot_id: string
          updated_at: string
        }
        Insert: {
          affiliate_click_id?: string | null
          affiliate_code_id?: string | null
          affiliate_id?: string | null
          alcohol_delivery_url?: string | null
          amount: number
          amount_paid?: number | null
          canceled_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          currency?: string
          customer_id: string
          deposit_amount: number
          headcount: number
          held_until?: string | null
          id?: string
          invoice_sent_at?: string | null
          notes?: string | null
          package_type: string
          party_type: string
          payment_plan?: string | null
          promo_code?: string | null
          source_type?: string | null
          source_url?: string | null
          status?: string
          stripe_invoice_id?: string | null
          stripe_invoice_url?: string | null
          stripe_payment_intent_id?: string | null
          time_slot_id: string
          updated_at?: string
        }
        Update: {
          affiliate_click_id?: string | null
          affiliate_code_id?: string | null
          affiliate_id?: string | null
          alcohol_delivery_url?: string | null
          amount?: number
          amount_paid?: number | null
          canceled_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          currency?: string
          customer_id?: string
          deposit_amount?: number
          headcount?: number
          held_until?: string | null
          id?: string
          invoice_sent_at?: string | null
          notes?: string | null
          package_type?: string
          party_type?: string
          payment_plan?: string | null
          promo_code?: string | null
          source_type?: string | null
          source_url?: string | null
          status?: string
          stripe_invoice_id?: string | null
          stripe_invoice_url?: string | null
          stripe_payment_intent_id?: string | null
          time_slot_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_affiliate_click_id_fkey"
            columns: ["affiliate_click_id"]
            isOneToOne: false
            referencedRelation: "affiliate_clicks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_affiliate_code_id_fkey"
            columns: ["affiliate_code_id"]
            isOneToOne: false
            referencedRelation: "affiliate_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_time_slot_id_fkey"
            columns: ["time_slot_id"]
            isOneToOne: false
            referencedRelation: "time_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_conversations: {
        Row: {
          created_at: string
          domain: string | null
          engagement_score: number
          id: string
          ip_address: string | null
          last_message_at: string | null
          last_message_preview: string | null
          lead_id: string | null
          page_url: string | null
          status: string
          unread_count: number
          updated_at: string
          visitor_email: string | null
          visitor_id: string
          visitor_name: string | null
          visitor_phone: string | null
        }
        Insert: {
          created_at?: string
          domain?: string | null
          engagement_score?: number
          id?: string
          ip_address?: string | null
          last_message_at?: string | null
          last_message_preview?: string | null
          lead_id?: string | null
          page_url?: string | null
          status?: string
          unread_count?: number
          updated_at?: string
          visitor_email?: string | null
          visitor_id: string
          visitor_name?: string | null
          visitor_phone?: string | null
        }
        Update: {
          created_at?: string
          domain?: string | null
          engagement_score?: number
          id?: string
          ip_address?: string | null
          last_message_at?: string | null
          last_message_preview?: string | null
          lead_id?: string | null
          page_url?: string | null
          status?: string
          unread_count?: number
          updated_at?: string
          visitor_email?: string | null
          visitor_id?: string
          visitor_name?: string | null
          visitor_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_conversations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          read_at: string | null
          sender_name: string | null
          sender_type: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_name?: string | null
          sender_type: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_name?: string | null
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_widget_rules: {
        Row: {
          action_type: string
          created_at: string
          cta_text: string | null
          cta_url: string | null
          domain: string | null
          enabled: boolean
          id: string
          max_shows_per_session: number
          name: string
          page_path_pattern: string | null
          priority: number
          prompt_message: string | null
          trigger_type: string
          trigger_value: string
          updated_at: string
          visitor_type: string
        }
        Insert: {
          action_type?: string
          created_at?: string
          cta_text?: string | null
          cta_url?: string | null
          domain?: string | null
          enabled?: boolean
          id?: string
          max_shows_per_session?: number
          name: string
          page_path_pattern?: string | null
          priority?: number
          prompt_message?: string | null
          trigger_type?: string
          trigger_value?: string
          updated_at?: string
          visitor_type?: string
        }
        Update: {
          action_type?: string
          created_at?: string
          cta_text?: string | null
          cta_url?: string | null
          domain?: string | null
          enabled?: boolean
          id?: string
          max_shows_per_session?: number
          name?: string
          page_path_pattern?: string | null
          priority?: number
          prompt_message?: string | null
          trigger_type?: string
          trigger_value?: string
          updated_at?: string
          visitor_type?: string
        }
        Relationships: []
      }
      chat_widget_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      customers: {
        Row: {
          auth_user_id: string | null
          created_at: string
          email: string
          id: string
          name: string
          phone: string | null
          stripe_customer_id: string | null
          updated_at: string
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string
          email: string
          id?: string
          name: string
          phone?: string | null
          stripe_customer_id?: string | null
          updated_at?: string
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          phone?: string | null
          stripe_customer_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      dashboard_config: {
        Row: {
          config: Json
          dashboard_type: string
          id: string
          section: string
          updated_at: string
        }
        Insert: {
          config?: Json
          dashboard_type: string
          id?: string
          section: string
          updated_at?: string
        }
        Update: {
          config?: Json
          dashboard_type?: string
          id?: string
          section?: string
          updated_at?: string
        }
        Relationships: []
      }
      dashboard_configs: {
        Row: {
          company_name: string
          created_at: string
          dashboard_type: string
          id: string
          name: string
          settings: Json
          slug: string
          status: string
          tabs: Json
          updated_at: string
        }
        Insert: {
          company_name: string
          created_at?: string
          dashboard_type?: string
          id?: string
          name: string
          settings?: Json
          slug: string
          status?: string
          tabs?: Json
          updated_at?: string
        }
        Update: {
          company_name?: string
          created_at?: string
          dashboard_type?: string
          id?: string
          name?: string
          settings?: Json
          slug?: string
          status?: string
          tabs?: Json
          updated_at?: string
        }
        Relationships: []
      }
      dashboard_messages: {
        Row: {
          booking_id: string
          clicked_at: string | null
          content: string
          created_at: string
          id: string
          read_at: string | null
          sender_name: string | null
          sender_type: string
          subject: string
          updated_at: string
        }
        Insert: {
          booking_id: string
          clicked_at?: string | null
          content: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_name?: string | null
          sender_type?: string
          subject: string
          updated_at?: string
        }
        Update: {
          booking_id?: string
          clicked_at?: string | null
          content?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_name?: string | null
          sender_type?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_messages_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      engagement_events: {
        Row: {
          created_at: string
          event_data: Json | null
          event_type: string
          id: string
          lead_id: string | null
          page_url: string | null
          quote_number: string | null
          session_id: string
        }
        Insert: {
          created_at?: string
          event_data?: Json | null
          event_type: string
          id?: string
          lead_id?: string | null
          page_url?: string | null
          quote_number?: string | null
          session_id: string
        }
        Update: {
          created_at?: string
          event_data?: Json | null
          event_type?: string
          id?: string
          lead_id?: string | null
          page_url?: string | null
          quote_number?: string | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "engagement_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      engagement_sessions: {
        Row: {
          created_at: string
          first_seen_at: string
          gamma_link_clicked: boolean | null
          gamma_scroll_depth_percent: number | null
          ghl_sync_count: number | null
          high_engagement_alert_sent_at: string | null
          id: string
          last_activity_at: string
          lead_id: string | null
          max_scroll_depth_percent: number | null
          quote_builder_interactions: number | null
          quote_number: string | null
          quote_open_count: number | null
          session_duration_seconds: number | null
          session_id: string
          synced_to_ghl_at: string | null
          total_video_watch_seconds: number | null
          updated_at: string
          video_max_progress: Json | null
          videos_started: Json | null
          xola_booking_started: boolean | null
          xola_tab_opened: boolean | null
        }
        Insert: {
          created_at?: string
          first_seen_at?: string
          gamma_link_clicked?: boolean | null
          gamma_scroll_depth_percent?: number | null
          ghl_sync_count?: number | null
          high_engagement_alert_sent_at?: string | null
          id?: string
          last_activity_at?: string
          lead_id?: string | null
          max_scroll_depth_percent?: number | null
          quote_builder_interactions?: number | null
          quote_number?: string | null
          quote_open_count?: number | null
          session_duration_seconds?: number | null
          session_id: string
          synced_to_ghl_at?: string | null
          total_video_watch_seconds?: number | null
          updated_at?: string
          video_max_progress?: Json | null
          videos_started?: Json | null
          xola_booking_started?: boolean | null
          xola_tab_opened?: boolean | null
        }
        Update: {
          created_at?: string
          first_seen_at?: string
          gamma_link_clicked?: boolean | null
          gamma_scroll_depth_percent?: number | null
          ghl_sync_count?: number | null
          high_engagement_alert_sent_at?: string | null
          id?: string
          last_activity_at?: string
          lead_id?: string | null
          max_scroll_depth_percent?: number | null
          quote_builder_interactions?: number | null
          quote_number?: string | null
          quote_open_count?: number | null
          session_duration_seconds?: number | null
          session_id?: string
          synced_to_ghl_at?: string | null
          total_video_watch_seconds?: number | null
          updated_at?: string
          video_max_progress?: Json | null
          videos_started?: Json | null
          xola_booking_started?: boolean | null
          xola_tab_opened?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "engagement_sessions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      experiences: {
        Row: {
          active: boolean
          base_price_per_hour: number
          created_at: string
          default_duration_minutes: number
          description: string | null
          id: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          base_price_per_hour: number
          created_at?: string
          default_duration_minutes: number
          description?: string | null
          id?: string
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          base_price_per_hour?: number
          created_at?: string
          default_duration_minutes?: number
          description?: string | null
          id?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      inn_cahoots_customers: {
        Row: {
          check_in: string | null
          check_out: string | null
          concierge_config: Json | null
          created_at: string
          dashboard_type: string
          email: string | null
          group_size: number | null
          id: string
          name: string
          notes: string | null
          partner_name: string | null
          party_type: string | null
          phone: string | null
          pod_link: string
          suite: string | null
        }
        Insert: {
          check_in?: string | null
          check_out?: string | null
          concierge_config?: Json | null
          created_at?: string
          dashboard_type?: string
          email?: string | null
          group_size?: number | null
          id?: string
          name: string
          notes?: string | null
          partner_name?: string | null
          party_type?: string | null
          phone?: string | null
          pod_link?: string
          suite?: string | null
        }
        Update: {
          check_in?: string | null
          check_out?: string | null
          concierge_config?: Json | null
          created_at?: string
          dashboard_type?: string
          email?: string | null
          group_size?: number | null
          id?: string
          name?: string
          notes?: string | null
          partner_name?: string | null
          party_type?: string | null
          phone?: string | null
          pod_link?: string
          suite?: string | null
        }
        Relationships: []
      }
      lead_tab_engagement: {
        Row: {
          click_count: number
          created_at: string
          id: string
          last_visited_at: string | null
          lead_id: string
          max_scroll_depth: number
          tab_name: string
          total_seconds: number
          updated_at: string
        }
        Insert: {
          click_count?: number
          created_at?: string
          id?: string
          last_visited_at?: string | null
          lead_id: string
          max_scroll_depth?: number
          tab_name: string
          total_seconds?: number
          updated_at?: string
        }
        Update: {
          click_count?: number
          created_at?: string
          id?: string
          last_visited_at?: string | null
          lead_id?: string
          max_scroll_depth?: number
          tab_name?: string
          total_seconds?: number
          updated_at?: string
        }
        Relationships: []
      }
      lead_tags: {
        Row: {
          created_at: string
          id: string
          lead_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lead_id: string
          tag_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lead_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_tags_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          affiliate_click_id: string | null
          affiliate_code_id: string | null
          affiliate_id: string | null
          converted_to_customer_id: string | null
          created_at: string
          email: string
          event_date: string
          first_name: string
          guest_count: number
          id: string
          last_name: string
          party_type: string
          phone: string
          quote_number: string | null
          quote_url: string
          source_type: string | null
          source_url: string | null
          status: string
          updated_at: string
        }
        Insert: {
          affiliate_click_id?: string | null
          affiliate_code_id?: string | null
          affiliate_id?: string | null
          converted_to_customer_id?: string | null
          created_at?: string
          email: string
          event_date: string
          first_name: string
          guest_count: number
          id?: string
          last_name: string
          party_type: string
          phone: string
          quote_number?: string | null
          quote_url: string
          source_type?: string | null
          source_url?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          affiliate_click_id?: string | null
          affiliate_code_id?: string | null
          affiliate_id?: string | null
          converted_to_customer_id?: string | null
          created_at?: string
          email?: string
          event_date?: string
          first_name?: string
          guest_count?: number
          id?: string
          last_name?: string
          party_type?: string
          phone?: string
          quote_number?: string | null
          quote_url?: string
          source_type?: string | null
          source_url?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_affiliate_click_id_fkey"
            columns: ["affiliate_click_id"]
            isOneToOne: false
            referencedRelation: "affiliate_clicks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_affiliate_code_id_fkey"
            columns: ["affiliate_code_id"]
            isOneToOne: false
            referencedRelation: "affiliate_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_converted_to_customer_id_fkey"
            columns: ["converted_to_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      message_templates: {
        Row: {
          content: string
          created_at: string
          id: string
          name: string
          subject: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          name: string
          subject: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          name?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      payment_installments: {
        Row: {
          amount: number
          booking_id: string
          created_at: string
          due_date: string
          id: string
          installment_number: number
          paid_at: string | null
          status: string
          stripe_payment_intent_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          booking_id: string
          created_at?: string
          due_date: string
          id?: string
          installment_number: number
          paid_at?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          booking_id?: string
          created_at?: string
          due_date?: string
          id?: string
          installment_number?: number
          paid_at?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_installments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_codes: {
        Row: {
          active: boolean
          affiliate_code_id: string | null
          affiliate_id: string | null
          applies_to_experience_id: string | null
          code: string
          created_at: string
          expires_at: string | null
          id: string
          tier_2_starts_at: string | null
          tier_2_value: number | null
          tier_3_starts_at: string | null
          tier_3_value: number | null
          type: string
          updated_at: string
          usage_count: number
          usage_limit: number | null
          value: number
        }
        Insert: {
          active?: boolean
          affiliate_code_id?: string | null
          affiliate_id?: string | null
          applies_to_experience_id?: string | null
          code: string
          created_at?: string
          expires_at?: string | null
          id?: string
          tier_2_starts_at?: string | null
          tier_2_value?: number | null
          tier_3_starts_at?: string | null
          tier_3_value?: number | null
          type: string
          updated_at?: string
          usage_count?: number
          usage_limit?: number | null
          value: number
        }
        Update: {
          active?: boolean
          affiliate_code_id?: string | null
          affiliate_id?: string | null
          applies_to_experience_id?: string | null
          code?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          tier_2_starts_at?: string | null
          tier_2_value?: number | null
          tier_3_starts_at?: string | null
          tier_3_value?: number | null
          type?: string
          updated_at?: string
          usage_count?: number
          usage_limit?: number | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "promo_codes_affiliate_code_id_fkey"
            columns: ["affiliate_code_id"]
            isOneToOne: false
            referencedRelation: "affiliate_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_codes_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_codes_applies_to_experience_id_fkey"
            columns: ["applies_to_experience_id"]
            isOneToOne: false
            referencedRelation: "experiences"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_analytics: {
        Row: {
          created_at: string
          event_data: Json | null
          event_type: string
          id: string
          ip_address: string | null
          page_url: string | null
          referrer: string | null
          session_id: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          event_data?: Json | null
          event_type: string
          id?: string
          ip_address?: string | null
          page_url?: string | null
          referrer?: string | null
          session_id: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          event_data?: Json | null
          event_type?: string
          id?: string
          ip_address?: string | null
          page_url?: string | null
          referrer?: string | null
          session_id?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      saved_quotes: {
        Row: {
          affiliate_click_id: string | null
          affiliate_code_id: string | null
          affiliate_id: string | null
          created_at: string
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          disco_package: string | null
          event_date: string
          experience_type: string | null
          expires_at: string | null
          guest_count: number
          guest_range: string | null
          id: string
          last_viewed_at: string | null
          lead_id: string | null
          package_type: string | null
          party_type: string
          pricing_details: Json | null
          private_capacity: string | null
          quote_number: string
          selected_addons: Json | null
          selected_boat_name: string | null
          selected_time_end: string | null
          selected_time_start: string | null
          status: string
          time_slot_id: string | null
          updated_at: string
          view_count: number
        }
        Insert: {
          affiliate_click_id?: string | null
          affiliate_code_id?: string | null
          affiliate_id?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          disco_package?: string | null
          event_date: string
          experience_type?: string | null
          expires_at?: string | null
          guest_count: number
          guest_range?: string | null
          id?: string
          last_viewed_at?: string | null
          lead_id?: string | null
          package_type?: string | null
          party_type: string
          pricing_details?: Json | null
          private_capacity?: string | null
          quote_number: string
          selected_addons?: Json | null
          selected_boat_name?: string | null
          selected_time_end?: string | null
          selected_time_start?: string | null
          status?: string
          time_slot_id?: string | null
          updated_at?: string
          view_count?: number
        }
        Update: {
          affiliate_click_id?: string | null
          affiliate_code_id?: string | null
          affiliate_id?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          disco_package?: string | null
          event_date?: string
          experience_type?: string | null
          expires_at?: string | null
          guest_count?: number
          guest_range?: string | null
          id?: string
          last_viewed_at?: string | null
          lead_id?: string | null
          package_type?: string | null
          party_type?: string
          pricing_details?: Json | null
          private_capacity?: string | null
          quote_number?: string
          selected_addons?: Json | null
          selected_boat_name?: string | null
          selected_time_end?: string | null
          selected_time_start?: string | null
          status?: string
          time_slot_id?: string | null
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "saved_quotes_affiliate_click_id_fkey"
            columns: ["affiliate_click_id"]
            isOneToOne: false
            referencedRelation: "affiliate_clicks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_quotes_affiliate_code_id_fkey"
            columns: ["affiliate_code_id"]
            isOneToOne: false
            referencedRelation: "affiliate_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_quotes_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_quotes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_quotes_time_slot_id_fkey"
            columns: ["time_slot_id"]
            isOneToOne: false
            referencedRelation: "time_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      time_slots: {
        Row: {
          boat_id: string
          capacity_available: number
          capacity_total: number
          created_at: string
          end_at: string
          experience_id: string
          held_until: string | null
          hourly_rate: number
          id: string
          notes: string | null
          price_override: number | null
          start_at: string
          status: string
          updated_at: string
        }
        Insert: {
          boat_id: string
          capacity_available: number
          capacity_total: number
          created_at?: string
          end_at: string
          experience_id: string
          held_until?: string | null
          hourly_rate: number
          id?: string
          notes?: string | null
          price_override?: number | null
          start_at: string
          status?: string
          updated_at?: string
        }
        Update: {
          boat_id?: string
          capacity_available?: number
          capacity_total?: number
          created_at?: string
          end_at?: string
          experience_id?: string
          held_until?: string | null
          hourly_rate?: number
          id?: string
          notes?: string | null
          price_override?: number | null
          start_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_slots_boat_id_fkey"
            columns: ["boat_id"]
            isOneToOne: false
            referencedRelation: "boats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_slots_experience_id_fkey"
            columns: ["experience_id"]
            isOneToOne: false
            referencedRelation: "experiences"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      visitor_page_views: {
        Row: {
          created_at: string
          domain: string
          duration_seconds: number | null
          entered_at: string
          id: string
          left_at: string | null
          page_title: string | null
          page_url: string
          scroll_depth: number | null
          session_id: string
          visitor_id: string
        }
        Insert: {
          created_at?: string
          domain: string
          duration_seconds?: number | null
          entered_at?: string
          id?: string
          left_at?: string | null
          page_title?: string | null
          page_url: string
          scroll_depth?: number | null
          session_id: string
          visitor_id: string
        }
        Update: {
          created_at?: string
          domain?: string
          duration_seconds?: number | null
          entered_at?: string
          id?: string
          left_at?: string | null
          page_title?: string | null
          page_url?: string
          scroll_depth?: number | null
          session_id?: string
          visitor_id?: string
        }
        Relationships: []
      }
      visitor_sessions: {
        Row: {
          created_at: string
          domain: string
          id: string
          ip_address: string | null
          is_active: boolean
          last_activity_at: string
          lead_id: string | null
          max_scroll_depth: number
          page_url: string | null
          page_views: number
          quote_number: string | null
          referrer_url: string | null
          session_id: string
          started_at: string
          total_seconds: number
          updated_at: string
          user_agent: string | null
          visitor_id: string
        }
        Insert: {
          created_at?: string
          domain: string
          id?: string
          ip_address?: string | null
          is_active?: boolean
          last_activity_at?: string
          lead_id?: string | null
          max_scroll_depth?: number
          page_url?: string | null
          page_views?: number
          quote_number?: string | null
          referrer_url?: string | null
          session_id: string
          started_at?: string
          total_seconds?: number
          updated_at?: string
          user_agent?: string | null
          visitor_id: string
        }
        Update: {
          created_at?: string
          domain?: string
          id?: string
          ip_address?: string | null
          is_active?: boolean
          last_activity_at?: string
          lead_id?: string | null
          max_scroll_depth?: number
          page_url?: string | null
          page_views?: number
          quote_number?: string | null
          referrer_url?: string | null
          session_id?: string
          started_at?: string
          total_seconds?: number
          updated_at?: string
          user_agent?: string | null
          visitor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "visitor_sessions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      waiver_signatures: {
        Row: {
          address: string | null
          booking_id: string
          created_at: string
          cruise_date: string | null
          date_of_birth: string | null
          disco_cruise_slot: string | null
          id: string
          initials: string
          ip_address: string | null
          organizer_name: string | null
          phone: string | null
          signature_data: string
          signed_at: string
          signer_email: string | null
          signer_name: string
          user_agent: string | null
        }
        Insert: {
          address?: string | null
          booking_id: string
          created_at?: string
          cruise_date?: string | null
          date_of_birth?: string | null
          disco_cruise_slot?: string | null
          id?: string
          initials: string
          ip_address?: string | null
          organizer_name?: string | null
          phone?: string | null
          signature_data: string
          signed_at?: string
          signer_email?: string | null
          signer_name: string
          user_agent?: string | null
        }
        Update: {
          address?: string | null
          booking_id?: string
          created_at?: string
          cruise_date?: string | null
          date_of_birth?: string | null
          disco_cruise_slot?: string | null
          id?: string
          initials?: string
          ip_address?: string | null
          organizer_name?: string | null
          phone?: string | null
          signature_data?: string
          signed_at?: string
          signer_email?: string | null
          signer_name?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "waiver_signatures_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bytea_to_text: { Args: { data: string }; Returns: string }
      generate_affiliate_code: { Args: never; Returns: string }
      get_affiliate_leaderboard: {
        Args: never
        Returns: {
          affiliate_id: string
          affiliate_name: string
          company_name: string
          conversion_rate: number
          total_abandoned: number
          total_clicks: number
          total_conversions: number
          total_leads: number
          total_revenue: number
        }[]
      }
      get_quote_analytics: { Args: { start_date?: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      http: {
        Args: { request: Database["public"]["CompositeTypes"]["http_request"] }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "http_request"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_delete:
        | {
            Args: { uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { content: string; content_type: string; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_get:
        | {
            Args: { uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { data: Json; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_head: {
        Args: { uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_header: {
        Args: { field: string; value: string }
        Returns: Database["public"]["CompositeTypes"]["http_header"]
        SetofOptions: {
          from: "*"
          to: "http_header"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_list_curlopt: {
        Args: never
        Returns: {
          curlopt: string
          value: string
        }[]
      }
      http_patch: {
        Args: { content: string; content_type: string; uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_post:
        | {
            Args: { content: string; content_type: string; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { data: Json; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_put: {
        Args: { content: string; content_type: string; uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_reset_curlopt: { Args: never; Returns: boolean }
      http_set_curlopt: {
        Args: { curlopt: string; value: string }
        Returns: boolean
      }
      text_to_bytea: { Args: { data: string }; Returns: string }
      urlencode:
        | { Args: { data: Json }; Returns: string }
        | {
            Args: { string: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.urlencode(string => bytea), public.urlencode(string => varchar). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
        | {
            Args: { string: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.urlencode(string => bytea), public.urlencode(string => varchar). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
    }
    CompositeTypes: {
      http_header: {
        field: string | null
        value: string | null
      }
      http_request: {
        method: unknown
        uri: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content_type: string | null
        content: string | null
      }
      http_response: {
        status: number | null
        content_type: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content: string | null
      }
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
