export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      rate_limits: {
        Row: {
          key: string;
          count: number;
          reset_at: string;
        };
        Insert: {
          key: string;
          count?: number;
          reset_at?: string;
        };
        Update: {
          key?: string;
          count?: number;
          reset_at?: string;
        };
        Relationships: [];
      };
      contact_messages: {
        Row: {
          id: string;
          name: string;
          email: string;
          subject: string | null;
          category: string;
          message: string;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          subject?: string | null;
          category?: string;
          message: string;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          subject?: string | null;
          category?: string;
          message?: string;
          status?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      analytics_events: {
        Row: {
          created_at: string;
          id: string;
          kind: string;
          payload: Json | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          kind: string;
          payload?: Json | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          kind?: string;
          payload?: Json | null;
          user_id?: string;
        };
        Relationships: [];
      };
      audit_logs: {
        Row: {
          action: string;
          created_at: string;
          id: string;
          payload: Json | null;
          user_id: string | null;
        };
        Insert: {
          action: string;
          created_at?: string;
          id?: string;
          payload?: Json | null;
          user_id?: string | null;
        };
        Update: {
          action?: string;
          created_at?: string;
          id?: string;
          payload?: Json | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      conversations: {
        Row: {
          created_at: string;
          id: string;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          title?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      escalations: {
        Row: {
          conversation_id: string | null;
          created_at: string;
          detail: string | null;
          id: string;
          reason: string;
          reviewer_id: string | null;
          status: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          conversation_id?: string | null;
          created_at?: string;
          detail?: string | null;
          id?: string;
          reason: string;
          reviewer_id?: string | null;
          status?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          conversation_id?: string | null;
          created_at?: string;
          detail?: string | null;
          id?: string;
          reason?: string;
          reviewer_id?: string | null;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "escalations_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
        ];
      };
      messages: {
        Row: {
          confidence: number | null;
          content: string;
          conversation_id: string;
          created_at: string;
          id: string;
          parts: Json | null;
          role: string;
          user_id: string;
        };
        Insert: {
          confidence?: number | null;
          content: string;
          conversation_id: string;
          created_at?: string;
          id?: string;
          parts?: Json | null;
          role: string;
          user_id: string;
        };
        Update: {
          confidence?: number | null;
          content?: string;
          conversation_id?: string;
          created_at?: string;
          id?: string;
          parts?: Json | null;
          role?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
        ];
      };
      note_chunks: {
        Row: {
          content: string;
          created_at: string;
          embedding: string | null;
          id: string;
          note_id: string;
          user_id: string;
        };
        Insert: {
          content: string;
          created_at?: string;
          embedding?: string | null;
          id?: string;
          note_id: string;
          user_id: string;
        };
        Update: {
          content?: string;
          created_at?: string;
          embedding?: string | null;
          id?: string;
          note_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "note_chunks_note_id_fkey";
            columns: ["note_id"];
            isOneToOne: false;
            referencedRelation: "notes";
            referencedColumns: ["id"];
          },
        ];
      };
      notes: {
        Row: {
          created_at: string;
          id: string;
          key_concepts: Json | null;
          raw_text: string | null;
          source_path: string | null;
          summary: string | null;
          title: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          key_concepts?: Json | null;
          raw_text?: string | null;
          source_path?: string | null;
          summary?: string | null;
          title: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          key_concepts?: Json | null;
          raw_text?: string | null;
          source_path?: string | null;
          summary?: string | null;
          title?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          curriculum: string | null;
          display_name: string | null;
          analytics_consent: boolean | null;
          cookie_consent: boolean | null;
          disclaimer_accepted: boolean | null;
          email: string | null;
          id: string;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          curriculum?: string | null;
          display_name?: string | null;
          analytics_consent?: boolean | null;
          cookie_consent?: boolean | null;
          disclaimer_accepted?: boolean | null;
          email?: string | null;
          id: string;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          curriculum?: string | null;
          display_name?: string | null;
          analytics_consent?: boolean | null;
          cookie_consent?: boolean | null;
          disclaimer_accepted?: boolean | null;
          email?: string | null;
          id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      quiz_attempts: {
        Row: {
          answers: Json;
          created_at: string;
          id: string;
          quiz_id: string;
          score: number;
          user_id: string;
          weak_topics: Json | null;
        };
        Insert: {
          answers: Json;
          created_at?: string;
          id?: string;
          quiz_id: string;
          score: number;
          user_id: string;
          weak_topics?: Json | null;
        };
        Update: {
          answers?: Json;
          created_at?: string;
          id?: string;
          quiz_id?: string;
          score?: number;
          user_id?: string;
          weak_topics?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey";
            columns: ["quiz_id"];
            isOneToOne: false;
            referencedRelation: "quizzes";
            referencedColumns: ["id"];
          },
        ];
      };
      quizzes: {
        Row: {
          created_at: string;
          difficulty: string;
          id: string;
          questions: Json;
          topic: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          difficulty?: string;
          id?: string;
          questions: Json;
          topic: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          difficulty?: string;
          id?: string;
          questions?: Json;
          topic?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      study_plans: {
        Row: {
          created_at: string;
          exam_date: string | null;
          exam_name: string;
          id: string;
          items: Json;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          exam_date?: string | null;
          exam_name: string;
          id?: string;
          items: Json;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          exam_date?: string | null;
          exam_name?: string;
          id?: string;
          items?: Json;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      match_note_chunks: {
        Args: {
          match_count?: number;
          match_user_id: string;
          query_embedding: string;
        };
        Returns: {
          content: string;
          id: string;
          note_id: string;
          similarity: number;
        }[];
      };
      upsert_rate_limit: {
        Args: {
          p_key: string;
          p_max: number;
          p_reset_at: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: "student" | "teacher" | "admin";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["student", "teacher", "admin"],
    },
  },
} as const;
