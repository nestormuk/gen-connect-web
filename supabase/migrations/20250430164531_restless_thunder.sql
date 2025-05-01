/*
  # Initial Schema for Family Tales App

  1. New Tables
    - `user_profiles`
      - `id` (uuid, primary key)
      - `user_id` (references auth.users)
      - `display_name` (text, not null)
      - `avatar_url` (text, nullable)
      - `bio` (text, nullable)
      - `birth_year` (integer, nullable)
      - `preferences` (jsonb, nullable)
      - `updated_at` (timestamptz, default now())
    - `family_groups`
      - `id` (uuid, primary key)
      - `name` (text, not null)
      - `created_at` (timestamptz, default now())
      - `created_by` (references auth.users)
    - `family_members`
      - `id` (uuid, primary key)
      - `family_id` (references family_groups)
      - `user_id` (references auth.users)
      - `role` (text, not null)
      - `joined_at` (timestamptz, default now())
    - `stories`
      - `id` (uuid, primary key)
      - `title` (text, not null)
      - `content` (jsonb, not null)
      - `cover_image` (text, nullable)
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())
      - `created_by` (references auth.users)
      - `family_id` (references family_groups)
      - `is_published` (boolean, default false)
    - `story_collaborators`
      - `id` (uuid, primary key)
      - `story_id` (references stories)
      - `user_id` (references auth.users)
      - `added_at` (timestamptz, default now())
    - `story_media`
      - `id` (uuid, primary key)
      - `story_id` (references stories)
      - `media_type` (text, not null)
      - `media_url` (text, not null)
      - `created_at` (timestamptz, default now())
      - `created_by` (references auth.users)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their data
    - Add policies for family members to access and edit family stories
*/

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  display_name text NOT NULL,
  avatar_url text,
  bio text,
  birth_year integer,
  preferences jsonb,
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT user_profiles_user_id_key UNIQUE (user_id)
);

-- Create family_groups table
CREATE TABLE IF NOT EXISTS family_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users NOT NULL
);

-- Create family_members table
CREATE TABLE IF NOT EXISTS family_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid REFERENCES family_groups NOT NULL,
  user_id uuid REFERENCES auth.users NOT NULL,
  role text NOT NULL,
  joined_at timestamptz DEFAULT now(),
  CONSTRAINT family_members_family_user_unique UNIQUE (family_id, user_id)
);

-- Create stories table
CREATE TABLE IF NOT EXISTS stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content jsonb NOT NULL,
  cover_image text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users NOT NULL,
  family_id uuid REFERENCES family_groups NOT NULL,
  is_published boolean DEFAULT false
);

-- Create story_collaborators table
CREATE TABLE IF NOT EXISTS story_collaborators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid REFERENCES stories NOT NULL,
  user_id uuid REFERENCES auth.users NOT NULL,
  added_at timestamptz DEFAULT now(),
  CONSTRAINT story_collaborators_story_user_unique UNIQUE (story_id, user_id)
);

-- Create story_media table
CREATE TABLE IF NOT EXISTS story_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid REFERENCES stories NOT NULL,
  media_type text NOT NULL,
  media_url text NOT NULL,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users NOT NULL
);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_media ENABLE ROW LEVEL SECURITY;

-- Policies for user_profiles
CREATE POLICY "Users can view their own profile"
  ON user_profiles
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON user_profiles
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON user_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policies for family_groups
CREATE POLICY "Users can create family groups"
  ON family_groups
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can view family groups they belong to"
  ON family_groups
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM family_members
      WHERE family_members.family_id = id
      AND family_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Creators can update their family groups"
  ON family_groups
  FOR UPDATE
  USING (auth.uid() = created_by);

-- Policies for family_members
CREATE POLICY "Users can view family members in their families"
  ON family_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM family_members AS fm
      WHERE fm.family_id = family_id
      AND fm.user_id = auth.uid()
    )
  );

CREATE POLICY "Family creators can manage family members"
  ON family_members
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM family_groups
      WHERE family_groups.id = family_id
      AND family_groups.created_by = auth.uid()
    )
  );

-- Policies for stories
CREATE POLICY "Users can view stories from their families"
  ON stories
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM family_members
      WHERE family_members.family_id = family_id
      AND family_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create stories in their families"
  ON stories
  FOR INSERT
  WITH CHECK (
    auth.uid() = created_by AND
    EXISTS (
      SELECT 1 FROM family_members
      WHERE family_members.family_id = family_id
      AND family_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Story creators can update their stories"
  ON stories
  FOR UPDATE
  USING (
    auth.uid() = created_by OR
    EXISTS (
      SELECT 1 FROM story_collaborators
      WHERE story_collaborators.story_id = id
      AND story_collaborators.user_id = auth.uid()
    )
  );

-- Policies for story_collaborators
CREATE POLICY "Story creators can manage collaborators"
  ON story_collaborators
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM stories
      WHERE stories.id = story_id
      AND stories.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can view collaborators for stories they can access"
  ON story_collaborators
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM stories
      JOIN family_members ON family_members.family_id = stories.family_id
      WHERE stories.id = story_id
      AND family_members.user_id = auth.uid()
    )
  );

-- Policies for story_media
CREATE POLICY "Users can view media for stories they can access"
  ON story_media
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM stories
      JOIN family_members ON family_members.family_id = stories.family_id
      WHERE stories.id = story_id
      AND family_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add media to stories they own or collaborate on"
  ON story_media
  FOR INSERT
  WITH CHECK (
    auth.uid() = created_by AND
    (
      EXISTS (
        SELECT 1 FROM stories
        WHERE stories.id = story_id
        AND stories.created_by = auth.uid()
      ) OR
      EXISTS (
        SELECT 1 FROM story_collaborators
        WHERE story_collaborators.story_id = story_id
        AND story_collaborators.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Media creators can update their media"
  ON story_media
  FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Media creators can delete their media"
  ON story_media
  FOR DELETE
  USING (auth.uid() = created_by);

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, display_name)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile for new users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Updated timestamp triggers
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();

CREATE TRIGGER update_stories_updated_at
  BEFORE UPDATE ON stories
  FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();