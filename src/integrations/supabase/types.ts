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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      clients: {
        Row: {
          company: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          pipeline_stage: Database["public"]["Enums"]["pipeline_stage"]
          portal_token: string
          status: Database["public"]["Enums"]["client_status"]
          tags: string[]
          total_revenue: number
          updated_at: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          pipeline_stage?: Database["public"]["Enums"]["pipeline_stage"]
          portal_token?: string
          status?: Database["public"]["Enums"]["client_status"]
          tags?: string[]
          total_revenue?: number
          updated_at?: string
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          pipeline_stage?: Database["public"]["Enums"]["pipeline_stage"]
          portal_token?: string
          status?: Database["public"]["Enums"]["client_status"]
          tags?: string[]
          total_revenue?: number
          updated_at?: string
        }
        Relationships: []
      }
      deliverables: {
        Row: {
          approved_at: string | null
          approved_by_email: string | null
          approved_by_name: string | null
          created_at: string
          description: string | null
          file_name: string | null
          file_path: string | null
          id: string
          mime_type: string | null
          project_id: string
          revision_notes: string | null
          size_bytes: number
          sort_order: number
          status: Database["public"]["Enums"]["deliverable_status"]
          title: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by_email?: string | null
          approved_by_name?: string | null
          created_at?: string
          description?: string | null
          file_name?: string | null
          file_path?: string | null
          id?: string
          mime_type?: string | null
          project_id: string
          revision_notes?: string | null
          size_bytes?: number
          sort_order?: number
          status?: Database["public"]["Enums"]["deliverable_status"]
          title: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by_email?: string | null
          approved_by_name?: string | null
          created_at?: string
          description?: string | null
          file_name?: string | null
          file_path?: string | null
          id?: string
          mime_type?: string | null
          project_id?: string
          revision_notes?: string | null
          size_bytes?: number
          sort_order?: number
          status?: Database["public"]["Enums"]["deliverable_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deliverables_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      email_log: {
        Row: {
          body: string
          client_id: string | null
          created_at: string
          error: string | null
          id: string
          sent_at: string
          status: string
          subject: string
          template_id: string | null
          to_email: string
        }
        Insert: {
          body: string
          client_id?: string | null
          created_at?: string
          error?: string | null
          id?: string
          sent_at?: string
          status?: string
          subject: string
          template_id?: string | null
          to_email: string
        }
        Update: {
          body?: string
          client_id?: string | null
          created_at?: string
          error?: string | null
          id?: string
          sent_at?: string
          status?: string
          subject?: string
          template_id?: string | null
          to_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_log_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_log_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          body: string
          created_at: string
          id: string
          name: string
          subject: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          name: string
          subject: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          name?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      finance_entries: {
        Row: {
          amount: number
          category: Database["public"]["Enums"]["finance_category"]
          client_id: string | null
          created_at: string
          description: string | null
          id: string
          kind: Database["public"]["Enums"]["finance_kind"]
          occurred_on: string
          project_id: string | null
          recurring: Database["public"]["Enums"]["recurring_frequency"]
          tax_category: Database["public"]["Enums"]["tax_category"] | null
          tax_deductible: boolean
          updated_at: string
        }
        Insert: {
          amount: number
          category: Database["public"]["Enums"]["finance_category"]
          client_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          kind: Database["public"]["Enums"]["finance_kind"]
          occurred_on?: string
          project_id?: string | null
          recurring?: Database["public"]["Enums"]["recurring_frequency"]
          tax_category?: Database["public"]["Enums"]["tax_category"] | null
          tax_deductible?: boolean
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: Database["public"]["Enums"]["finance_category"]
          client_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["finance_kind"]
          occurred_on?: string
          project_id?: string | null
          recurring?: Database["public"]["Enums"]["recurring_frequency"]
          tax_category?: Database["public"]["Enums"]["tax_category"] | null
          tax_deductible?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_entries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          client_id: string | null
          created_at: string
          due_date: string | null
          id: string
          invoice_number: string
          issue_date: string
          line_items: Json
          notes: string | null
          paid_on: string | null
          payment_instructions: string | null
          project_id: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          tax_rate: number
          updated_at: string
        }
        Insert: {
          amount?: number
          client_id?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          invoice_number?: string
          issue_date?: string
          line_items?: Json
          notes?: string | null
          paid_on?: string | null
          payment_instructions?: string | null
          project_id?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          tax_rate?: number
          updated_at?: string
        }
        Update: {
          amount?: number
          client_id?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          invoice_number?: string
          issue_date?: string
          line_items?: Json
          notes?: string | null
          paid_on?: string | null
          payment_instructions?: string | null
          project_id?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          tax_rate?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string | null
          metadata: Json
          title: string
          type: Database["public"]["Enums"]["notification_type"]
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string | null
          metadata?: Json
          title: string
          type: Database["public"]["Enums"]["notification_type"]
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string | null
          metadata?: Json
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
        }
        Relationships: []
      }
      project_activity: {
        Row: {
          action: string
          created_at: string
          description: string | null
          id: string
          payload: Json
          project_id: string
        }
        Insert: {
          action: string
          created_at?: string
          description?: string | null
          id?: string
          payload?: Json
          project_id: string
        }
        Update: {
          action?: string
          created_at?: string
          description?: string | null
          id?: string
          payload?: Json
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_activity_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_files: {
        Row: {
          id: string
          mime_type: string | null
          name: string
          project_id: string
          size_bytes: number
          storage_path: string
          uploaded_at: string
        }
        Insert: {
          id?: string
          mime_type?: string | null
          name: string
          project_id: string
          size_bytes?: number
          storage_path: string
          uploaded_at?: string
        }
        Update: {
          id?: string
          mime_type?: string | null
          name?: string
          project_id?: string
          size_bytes?: number
          storage_path?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_milestones: {
        Row: {
          approved_at: string | null
          approved_by_email: string | null
          approved_by_name: string | null
          completed: boolean
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          project_id: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by_email?: string | null
          approved_by_name?: string | null
          completed?: boolean
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          project_id: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by_email?: string | null
          approved_by_name?: string | null
          completed?: boolean
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          project_id?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          budget: number | null
          client_id: string | null
          created_at: string
          deadline: string | null
          description: string | null
          id: string
          is_archived: boolean
          is_pinned: boolean
          name: string
          progress: number
          start_date: string | null
          status: Database["public"]["Enums"]["project_status"]
          tech_stack: string[]
          updated_at: string
        }
        Insert: {
          budget?: number | null
          client_id?: string | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          id?: string
          is_archived?: boolean
          is_pinned?: boolean
          name: string
          progress?: number
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          tech_stack?: string[]
          updated_at?: string
        }
        Update: {
          budget?: number | null
          client_id?: string | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          id?: string
          is_archived?: boolean
          is_pinned?: boolean
          name?: string
          progress?: number
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          tech_stack?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      proposals: {
        Row: {
          accepted_at: string | null
          accepted_by_email: string | null
          accepted_by_name: string | null
          client_id: string | null
          created_at: string
          currency: string
          id: string
          price: number
          project_id: string | null
          scope: string
          sent_at: string | null
          share_token: string
          status: Database["public"]["Enums"]["proposal_status"]
          title: string
          updated_at: string
          valid_until: string | null
          viewed_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          accepted_by_email?: string | null
          accepted_by_name?: string | null
          client_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          price?: number
          project_id?: string | null
          scope?: string
          sent_at?: string | null
          share_token?: string
          status?: Database["public"]["Enums"]["proposal_status"]
          title: string
          updated_at?: string
          valid_until?: string | null
          viewed_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          accepted_by_email?: string | null
          accepted_by_name?: string | null
          client_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          price?: number
          project_id?: string | null
          scope?: string
          sent_at?: string | null
          share_token?: string
          status?: Database["public"]["Enums"]["proposal_status"]
          title?: string
          updated_at?: string
          valid_until?: string | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          created_at: string
          description: string | null
          done: boolean
          due_date: string | null
          energy_level: string | null
          estimated_minutes: number | null
          id: string
          is_important: boolean
          is_urgent: boolean
          priority: Database["public"]["Enums"]["task_priority"]
          project_id: string | null
          quadrant: Database["public"]["Enums"]["task_quadrant"]
          title: string
          updated_at: string
          work_type: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          done?: boolean
          due_date?: string | null
          energy_level?: string | null
          estimated_minutes?: number | null
          id?: string
          is_important?: boolean
          is_urgent?: boolean
          priority?: Database["public"]["Enums"]["task_priority"]
          project_id?: string | null
          quadrant?: Database["public"]["Enums"]["task_quadrant"]
          title: string
          updated_at?: string
          work_type?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          done?: boolean
          due_date?: string | null
          energy_level?: string | null
          estimated_minutes?: number | null
          id?: string
          is_important?: boolean
          is_urgent?: boolean
          priority?: Database["public"]["Enums"]["task_priority"]
          project_id?: string | null
          quadrant?: Database["public"]["Enums"]["task_quadrant"]
          title?: string
          updated_at?: string
          work_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      time_logs: {
        Row: {
          billable: boolean
          created_at: string
          duration_seconds: number
          hourly_rate: number | null
          id: string
          mode: Database["public"]["Enums"]["timer_mode"]
          note: string | null
          project_id: string | null
          started_at: string
          task_id: string | null
        }
        Insert: {
          billable?: boolean
          created_at?: string
          duration_seconds: number
          hourly_rate?: number | null
          id?: string
          mode?: Database["public"]["Enums"]["timer_mode"]
          note?: string | null
          project_id?: string | null
          started_at?: string
          task_id?: string | null
        }
        Update: {
          billable?: boolean
          created_at?: string
          duration_seconds?: number
          hourly_rate?: number | null
          id?: string
          mode?: Database["public"]["Enums"]["timer_mode"]
          note?: string | null
          project_id?: string | null
          started_at?: string
          task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "time_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_logs_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
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
      workspace_settings: {
        Row: {
          accent_hsl: string
          created_at: string
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          tagline: string | null
          tax_rate: number
          updated_at: string
        }
        Insert: {
          accent_hsl?: string
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          tagline?: string | null
          tax_rate?: number
          updated_at?: string
        }
        Update: {
          accent_hsl?: string
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          tagline?: string | null
          tax_rate?: number
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_proposal: {
        Args: { _email: string; _name: string; _token: string }
        Returns: Json
      }
      approve_milestone: {
        Args: {
          _email: string
          _milestone_id: string
          _name: string
          _token: string
        }
        Returns: Json
      }
      get_deliverable_storage_path: {
        Args: { _deliverable_id: string; _token: string }
        Returns: Json
      }
      get_portal_data: { Args: { _token: string }; Returns: Json }
      get_proposal_by_token: {
        Args: { _token: string }
        Returns: {
          accepted_at: string
          client_company: string
          client_name: string
          currency: string
          id: string
          price: number
          scope: string
          status: Database["public"]["Enums"]["proposal_status"]
          title: string
          valid_until: string
          workspace_logo_url: string
          workspace_name: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      mark_proposal_viewed: { Args: { _token: string }; Returns: undefined }
      project_actual_revenue: { Args: { _project_id: string }; Returns: number }
      recalc_client_revenue: {
        Args: { _client_id: string }
        Returns: undefined
      }
      set_deliverable_status: {
        Args: {
          _deliverable_id: string
          _email: string
          _name: string
          _revision_notes?: string
          _status: Database["public"]["Enums"]["deliverable_status"]
          _token: string
        }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "user"
      client_status: "lead" | "active" | "completed"
      deliverable_status: "pending" | "approved" | "revision_requested"
      finance_category:
        | "invoice"
        | "freelance"
        | "other_income"
        | "subscription"
        | "ads"
        | "tools"
        | "other_expense"
      finance_kind: "income" | "expense"
      invoice_status: "draft" | "sent" | "paid" | "overdue" | "cancelled"
      notification_type:
        | "task_due_soon"
        | "project_status_changed"
        | "finance_entry_added"
        | "system"
      pipeline_stage:
        | "lead"
        | "proposal_sent"
        | "negotiation"
        | "active"
        | "completed"
      project_status:
        | "planning"
        | "in_progress"
        | "review"
        | "completed"
        | "on_hold"
      proposal_status:
        | "draft"
        | "sent"
        | "viewed"
        | "accepted"
        | "rejected"
        | "expired"
      recurring_frequency: "none" | "monthly" | "yearly"
      task_priority: "high" | "medium" | "low"
      task_quadrant: "q1" | "q2" | "q3" | "q4"
      tax_category: "software" | "office" | "travel" | "marketing" | "other"
      timer_mode: "stopwatch" | "pomodoro"
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
      app_role: ["admin", "user"],
      client_status: ["lead", "active", "completed"],
      deliverable_status: ["pending", "approved", "revision_requested"],
      finance_category: [
        "invoice",
        "freelance",
        "other_income",
        "subscription",
        "ads",
        "tools",
        "other_expense",
      ],
      finance_kind: ["income", "expense"],
      invoice_status: ["draft", "sent", "paid", "overdue", "cancelled"],
      notification_type: [
        "task_due_soon",
        "project_status_changed",
        "finance_entry_added",
        "system",
      ],
      pipeline_stage: [
        "lead",
        "proposal_sent",
        "negotiation",
        "active",
        "completed",
      ],
      project_status: [
        "planning",
        "in_progress",
        "review",
        "completed",
        "on_hold",
      ],
      proposal_status: [
        "draft",
        "sent",
        "viewed",
        "accepted",
        "rejected",
        "expired",
      ],
      recurring_frequency: ["none", "monthly", "yearly"],
      task_priority: ["high", "medium", "low"],
      task_quadrant: ["q1", "q2", "q3", "q4"],
      tax_category: ["software", "office", "travel", "marketing", "other"],
      timer_mode: ["stopwatch", "pomodoro"],
    },
  },
} as const
