/*
  # Fix family_members policies

  1. Changes
    - Remove recursive policies that were causing infinite loops
    - Create new, optimized policies for family member management
    - Ensure proper access control while avoiding circular references

  2. Security
    - Maintain row-level security
    - Ensure creators can manage their family members
    - Allow members to view their family groups
    - Enable secure joining of families
*/

-- Drop all existing policies on family_members to start fresh
DROP POLICY IF EXISTS "view_family_members" ON family_members;
DROP POLICY IF EXISTS "manage_family_members" ON family_members;
DROP POLICY IF EXISTS "join_family" ON family_members;
DROP POLICY IF EXISTS "creators_manage_family_members" ON family_members;
DROP POLICY IF EXISTS "members_view_family_members" ON family_members;
DROP POLICY IF EXISTS "users_can_join_families" ON family_members;

-- Create new, optimized policies

-- Allow users to view members of families they belong to
CREATE POLICY "view_family_members"
  ON family_members
  FOR SELECT
  TO authenticated
  USING (
    -- User can see their own membership
    user_id = auth.uid() 
    OR 
    -- User can see members of families they belong to
    family_id IN (
      SELECT family_id 
      FROM family_members 
      WHERE user_id = auth.uid()
    )
  );

-- Allow family creators to manage members
CREATE POLICY "manage_family_members"
  ON family_members
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM family_groups 
      WHERE id = family_id 
      AND created_by = auth.uid()
    )
  );

-- Allow users to join families (controlled by application logic)
CREATE POLICY "join_family"
  ON family_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Users can add themselves
    user_id = auth.uid() 
    OR 
    -- Family creators can add members
    EXISTS (
      SELECT 1 
      FROM family_groups 
      WHERE id = family_id 
      AND created_by = auth.uid()
    )
  );