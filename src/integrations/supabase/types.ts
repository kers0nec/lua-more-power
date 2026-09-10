export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      api_keys: {
        Row: {
          created_at: string;
          id: string;
          key_hash: string;
          label: string;
          last_used_at: string | null;
          prefix: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          key_hash: string;
          label: string;
          last_used_at?: string | null;
          prefix: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          key_hash?: string;
          label?: string;
          last_used_at?: string | null;
          prefix?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      execution_logs: {
        Row: {
          created_at: string;
          hwid: string | null;
          id: string;
          ip: string | null;
          key: string | null;
          license_key_id: string | null;
          place_id: string | null;
          roblox_user_id: string | null;
          roblox_username: string | null;
          script_id: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          hwid?: string | null;
          id?: string;
          ip?: string | null;
          key?: string | null;
          license_key_id?: string | null;
          place_id?: string | null;
          roblox_user_id?: string | null;
          roblox_username?: string | null;
          script_id?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          hwid?: string | null;
          id?: string;
          ip?: string | null;
          key?: string | null;
          license_key_id?: string | null;
          place_id?: string | null;
          roblox_user_id?: string | null;
          roblox_username?: string | null;
          script_id?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "execution_logs_license_key_id_fkey";
            columns: ["license_key_id"];
            isOneToOne: false;
            referencedRelation: "license_keys";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "execution_logs_script_id_fkey";
            columns: ["script_id"];
            isOneToOne: false;
            referencedRelation: "scripts";
            referencedColumns: ["id"];
          },
        ];
      };
      hwid_bans: {
        Row: {
          created_at: string;
          hwid: string;
          id: string;
          reason: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          hwid: string;
          id?: string;
          reason?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          hwid?: string;
          id?: string;
          reason?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      key_batches: {
        Row: {
          created_at: string;
          hours_valid: number | null;
          id: string;
          note: string | null;
          panel_id: string | null;
          script_id: string | null;
          size: number;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          hours_valid?: number | null;
          id?: string;
          note?: string | null;
          panel_id?: string | null;
          script_id?: string | null;
          size: number;
          user_id: string;
        };
        Update: {
          created_at?: string;
          hours_valid?: number | null;
          id?: string;
          note?: string | null;
          panel_id?: string | null;
          script_id?: string | null;
          size?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "key_batches_panel_id_fkey";
            columns: ["panel_id"];
            isOneToOne: false;
            referencedRelation: "panels";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "key_batches_script_id_fkey";
            columns: ["script_id"];
            isOneToOne: false;
            referencedRelation: "scripts";
            referencedColumns: ["id"];
          },
        ];
      };
      license_keys: {
        Row: {
          batch_id: string | null;
          created_at: string;
          discord_id: string | null;
          expires_at: string | null;
          hours_valid: number | null;
          hwid: string | null;
          id: string;
          key: string;
          note: string | null;
          panel_id: string | null;
          revoked: boolean;
          script_id: string | null;
          user_id: string;
        };
        Insert: {
          batch_id?: string | null;
          created_at?: string;
          discord_id?: string | null;
          expires_at?: string | null;
          hours_valid?: number | null;
          hwid?: string | null;
          id?: string;
          key: string;
          note?: string | null;
          panel_id?: string | null;
          revoked?: boolean;
          script_id?: string | null;
          user_id: string;
        };
        Update: {
          batch_id?: string | null;
          created_at?: string;
          discord_id?: string | null;
          expires_at?: string | null;
          hours_valid?: number | null;
          hwid?: string | null;
          id?: string;
          key?: string;
          note?: string | null;
          panel_id?: string | null;
          revoked?: boolean;
          script_id?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "license_keys_panel_id_fkey";
            columns: ["panel_id"];
            isOneToOne: false;
            referencedRelation: "panels";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "license_keys_script_id_fkey";
            columns: ["script_id"];
            isOneToOne: false;
            referencedRelation: "scripts";
            referencedColumns: ["id"];
          },
        ];
      };
      panels: {
        Row: {
          admin_role_ids: string[];
          channel_id: string | null;
          created_at: string;
          description: string | null;
          discord_role_id: string | null;
          id: string;
          name: string;
          script_id: string | null;
          user_id: string;
          webhook_url: string | null;
          whitelist_channel_id: string | null;
        };
        Insert: {
          admin_role_ids?: string[];
          channel_id?: string | null;
          created_at?: string;
          description?: string | null;
          discord_role_id?: string | null;
          id?: string;
          name: string;
          script_id?: string | null;
          user_id: string;
          webhook_url?: string | null;
          whitelist_channel_id?: string | null;
        };
        Update: {
          admin_role_ids?: string[];
          channel_id?: string | null;
          created_at?: string;
          description?: string | null;
          discord_role_id?: string | null;
          id?: string;
          name?: string;
          script_id?: string | null;
          user_id?: string;
          webhook_url?: string | null;
          whitelist_channel_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "panels_script_id_fkey";
            columns: ["script_id"];
            isOneToOne: false;
            referencedRelation: "scripts";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          discord_id: string | null;
          display_name: string | null;
          email: string | null;
          id: string;
          is_banned: boolean;
          max_panels: number;
          max_scripts: number;
          plan: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          discord_id?: string | null;
          display_name?: string | null;
          email?: string | null;
          id: string;
          is_banned?: boolean;
          max_panels?: number;
          max_scripts?: number;
          plan?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          discord_id?: string | null;
          display_name?: string | null;
          email?: string | null;
          id?: string;
          is_banned?: boolean;
          max_panels?: number;
          max_scripts?: number;
          plan?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      script_releases: {
        Row: {
          created_at: string;
          id: string;
          is_beta: boolean;
          is_protected: boolean;
          larph_hash: string | null;
          note: string | null;
          obfuscated_code: string;
          obfuscator: string | null;
          script_id: string;
          user_id: string;
          version: number;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_beta?: boolean;
          is_protected?: boolean;
          larph_hash?: string | null;
          note?: string | null;
          obfuscated_code: string;
          obfuscator?: string | null;
          script_id: string;
          user_id: string;
          version?: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_beta?: boolean;
          is_protected?: boolean;
          larph_hash?: string | null;
          note?: string | null;
          obfuscated_code?: string;
          obfuscator?: string | null;
          script_id?: string;
          user_id?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "script_releases_script_id_fkey";
            columns: ["script_id"];
            isOneToOne: false;
            referencedRelation: "scripts";
            referencedColumns: ["id"];
          },
        ];
      };
      scripts: {
        Row: {
          category: string | null;
          code: string;
          created_at: string;
          description: string | null;
          ffa: boolean;
          id: string;
          is_active: boolean;
          is_protected: boolean;
          larph_hash: string | null;
          last_run_at: string | null;
          name: string;
          obfuscated_code: string | null;
          obfuscator: string | null;
          public_id: string;
          run_count: number;
          tags: string[];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          category?: string | null;
          code?: string;
          created_at?: string;
          description?: string | null;
          ffa?: boolean;
          id?: string;
          is_active?: boolean;
          is_protected?: boolean;
          larph_hash?: string | null;
          last_run_at?: string | null;
          name: string;
          obfuscated_code?: string | null;
          obfuscator?: string | null;
          public_id?: string;
          run_count?: number;
          tags?: string[];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          category?: string | null;
          code?: string;
          created_at?: string;
          description?: string | null;
          ffa?: boolean;
          id?: string;
          is_active?: boolean;
          is_protected?: boolean;
          larph_hash?: string | null;
          last_run_at?: string | null;
          name?: string;
          obfuscated_code?: string | null;
          obfuscator?: string | null;
          public_id?: string;
          run_count?: number;
          tags?: string[];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      user_bans: {
        Row: {
          created_at: string;
          discord_id: string;
          id: string;
          reason: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          discord_id: string;
          id?: string;
          reason?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          discord_id?: string;
          id?: string;
          reason?: string | null;
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
      whitelists: {
        Row: {
          created_at: string;
          discord_id: string;
          expires_at: string | null;
          id: string;
          license_key_id: string | null;
          script_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          discord_id: string;
          expires_at?: string | null;
          id?: string;
          license_key_id?: string | null;
          script_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          discord_id?: string;
          expires_at?: string | null;
          id?: string;
          license_key_id?: string | null;
          script_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "whitelists_license_key_id_fkey";
            columns: ["license_key_id"];
            isOneToOne: false;
            referencedRelation: "license_keys";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "whitelists_script_id_fkey";
            columns: ["script_id"];
            isOneToOne: false;
            referencedRelation: "scripts";
            referencedColumns: ["id"];
          },
        ];
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
    };
    Enums: {
      app_role: "owner" | "admin" | "user";
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["owner", "admin", "user"],
    },
  },
} as const;
