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
  public: {
    Tables: {
      coding_attempts: {
        Row: {
          duration_seconds: number | null
          event_id: string
          id: string
          started_at: string
          status: string
          submitted_at: string | null
          total_passed: number
          total_score: number
          user_id: string
        }
        Insert: {
          duration_seconds?: number | null
          event_id: string
          id?: string
          started_at?: string
          status?: string
          submitted_at?: string | null
          total_passed?: number
          total_score?: number
          user_id: string
        }
        Update: {
          duration_seconds?: number | null
          event_id?: string
          id?: string
          started_at?: string
          status?: string
          submitted_at?: string | null
          total_passed?: number
          total_score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coding_attempts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      coding_drafts: {
        Row: {
          attempt_id: string
          code: string
          id: string
          language: string
          question_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attempt_id: string
          code?: string
          id?: string
          language?: string
          question_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attempt_id?: string
          code?: string
          id?: string
          language?: string
          question_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coding_drafts_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "coding_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coding_drafts_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "coding_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      coding_questions: {
        Row: {
          constraints: string
          created_at: string
          description: string
          difficulty: string
          event_id: string
          id: string
          input_format: string
          marks_per_case: number
          memory_limit_mb: number
          output_format: string
          position: number
          time_limit_ms: number
          title: string
        }
        Insert: {
          constraints?: string
          created_at?: string
          description?: string
          difficulty: string
          event_id: string
          id?: string
          input_format?: string
          marks_per_case?: number
          memory_limit_mb?: number
          output_format?: string
          position?: number
          time_limit_ms?: number
          title: string
        }
        Update: {
          constraints?: string
          created_at?: string
          description?: string
          difficulty?: string
          event_id?: string
          id?: string
          input_format?: string
          marks_per_case?: number
          memory_limit_mb?: number
          output_format?: string
          position?: number
          time_limit_ms?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "coding_questions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      coding_submissions: {
        Row: {
          attempt_id: string
          code: string
          created_at: string
          event_id: string
          id: string
          language: string
          passed_count: number
          question_id: string
          results: Json
          score: number
          total_count: number
          user_id: string
          verdict: string
        }
        Insert: {
          attempt_id: string
          code: string
          created_at?: string
          event_id: string
          id?: string
          language: string
          passed_count?: number
          question_id: string
          results?: Json
          score?: number
          total_count?: number
          user_id: string
          verdict?: string
        }
        Update: {
          attempt_id?: string
          code?: string
          created_at?: string
          event_id?: string
          id?: string
          language?: string
          passed_count?: number
          question_id?: string
          results?: Json
          score?: number
          total_count?: number
          user_id?: string
          verdict?: string
        }
        Relationships: [
          {
            foreignKeyName: "coding_submissions_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "coding_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coding_submissions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coding_submissions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "coding_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      coding_test_cases: {
        Row: {
          created_at: string
          expected_output: string
          id: string
          input: string
          is_sample: boolean
          position: number
          question_id: string
        }
        Insert: {
          created_at?: string
          expected_output?: string
          id?: string
          input?: string
          is_sample?: boolean
          position?: number
          question_id: string
        }
        Update: {
          created_at?: string
          expected_output?: string
          id?: string
          input?: string
          is_sample?: boolean
          position?: number
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coding_test_cases_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "coding_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      event_participants: {
        Row: {
          created_at: string
          event_id: string
          id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_participants_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          created_by: string | null
          ends_at: string
          id: string
          name: string
          results_published: boolean
          starts_at: string
          status: string
          type: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          ends_at: string
          id?: string
          name: string
          results_published?: boolean
          starts_at: string
          status?: string
          type: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          ends_at?: string
          id?: string
          name?: string
          results_published?: boolean
          starts_at?: string
          status?: string
          type?: string
        }
        Relationships: []
      }
      mcq_attempts: {
        Row: {
          answers: Json
          correct_count: number | null
          duration_seconds: number | null
          event_id: string
          id: string
          marked: Json
          score: number | null
          started_at: string
          status: string
          submitted_at: string | null
          unanswered_count: number | null
          user_id: string
          wrong_count: number | null
        }
        Insert: {
          answers?: Json
          correct_count?: number | null
          duration_seconds?: number | null
          event_id: string
          id?: string
          marked?: Json
          score?: number | null
          started_at?: string
          status?: string
          submitted_at?: string | null
          unanswered_count?: number | null
          user_id: string
          wrong_count?: number | null
        }
        Update: {
          answers?: Json
          correct_count?: number | null
          duration_seconds?: number | null
          event_id?: string
          id?: string
          marked?: Json
          score?: number | null
          started_at?: string
          status?: string
          submitted_at?: string | null
          unanswered_count?: number | null
          user_id?: string
          wrong_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "mcq_attempts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      mcq_questions: {
        Row: {
          correct_option: string
          created_at: string
          event_id: string
          id: string
          marks: number
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          position: number
          question: string
        }
        Insert: {
          correct_option: string
          created_at?: string
          event_id: string
          id?: string
          marks?: number
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          position?: number
          question: string
        }
        Update: {
          correct_option?: string
          created_at?: string
          event_id?: string
          id?: string
          marks?: number
          option_a?: string
          option_b?: string
          option_c?: string
          option_d?: string
          position?: number
          question?: string
        }
        Relationships: [
          {
            foreignKeyName: "mcq_questions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      proctor_logs: {
        Row: {
          created_at: string
          detail: string
          event_id: string
          id: string
          kind: string
          user_id: string
        }
        Insert: {
          created_at?: string
          detail?: string
          event_id: string
          id?: string
          kind: string
          user_id: string
        }
        Update: {
          created_at?: string
          detail?: string
          event_id?: string
          id?: string
          kind?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "proctor_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          is_active: boolean
          participant_code: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string
          id: string
          is_active?: boolean
          participant_code?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          participant_code?: string | null
        }
        Relationships: []
      }
      shortlists: {
        Row: {
          created_at: string
          from_event_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          from_event_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          from_event_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shortlists_from_event_id_fkey"
            columns: ["from_event_id"]
            isOneToOne: false
            referencedRelation: "events"
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "participant"
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
  public: {
    Enums: {
      app_role: ["admin", "participant"],
    },
  },
} as const
