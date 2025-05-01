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
      family_groups: {
        Row: {
          id: string
          name: string
          created_at: string
          created_by: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
          created_by: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
          created_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_groups_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      family_members: {
        Row: {
          id: string
          family_id: string
          user_id: string
          role: string
          joined_at: string
        }
        Insert: {
          id?: string
          family_id: string
          user_id: string
          role: string
          joined_at?: string
        }
        Update: {
          id?: string
          family_id?: string
          user_id?: string
          role?: string
          joined_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_members_family_id_fkey"
            columns: ["family_id"]
            referencedRelation: "family_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_members_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      stories: {
        Row: {
          id: string
          title: string
          content: Json
          cover_image: string | null
          created_at: string
          updated_at: string
          created_by: string
          family_id: string
          is_published: boolean
        }
        Insert: {
          id?: string
          title: string
          content: Json
          cover_image?: string | null
          created_at?: string
          updated_at?: string
          created_by: string
          family_id: string
          is_published?: boolean
        }
        Update: {
          id?: string
          title?: string
          content?: Json
          cover_image?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string
          family_id?: string
          is_published?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "stories_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stories_family_id_fkey"
            columns: ["family_id"]
            referencedRelation: "family_groups"
            referencedColumns: ["id"]
          }
        ]
      }
      story_collaborators: {
        Row: {
          id: string
          story_id: string
          user_id: string
          added_at: string
        }
        Insert: {
          id?: string
          story_id: string
          user_id: string
          added_at?: string
        }
        Update: {
          id?: string
          story_id?: string
          user_id?: string
          added_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_collaborators_story_id_fkey"
            columns: ["story_id"]
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_collaborators_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      story_media: {
        Row: {
          id: string
          story_id: string
          media_type: string
          media_url: string
          created_at: string
          created_by: string
        }
        Insert: {
          id?: string
          story_id: string
          media_type: string
          media_url: string
          created_at?: string
          created_by: string
        }
        Update: {
          id?: string
          story_id?: string
          media_type?: string
          media_url?: string
          created_at?: string
          created_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_media_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_media_story_id_fkey"
            columns: ["story_id"]
            referencedRelation: "stories"
            referencedColumns: ["id"]
          }
        ]
      }
      user_profiles: {
        Row: {
          id: string
          user_id: string
          display_name: string
          avatar_url: string | null
          bio: string | null
          birth_year: number | null
          preferences: Json | null
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          display_name: string
          avatar_url?: string | null
          bio?: string | null
          birth_year?: number | null
          preferences?: Json | null
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          display_name?: string
          avatar_url?: string | null
          bio?: string | null
          birth_year?: number | null
          preferences?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}