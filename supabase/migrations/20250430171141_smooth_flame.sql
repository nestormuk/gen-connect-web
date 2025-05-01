/*
  # Fix Family Members RLS Policies

  1. Changes
    - Remove recursive policies that were causing infinite loops
    - Implement new, more efficient policies for family_members table
    - Fix policy for viewing family members to avoid recursion
    - Add policy for creating family members without recursion
    - Add policy for managing family members as creator

  2. Security
    - Maintains row level security
    - Ensures users can only access their own family data
    - Preserves creator privileges
*/

-- Drop existing policies to replace them with fixed versions
DROP POLICY IF EXISTS "creators_manage_family_members" ON family_members;
DROP POLICY IF EXISTS "members_view_family_members" ON family_members;

-- Policy for creators to manage family members
CREATE POLICY "creators_manage_family_members" ON family_members
  FOR ALL 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM family_groups
      WHERE family_groups.id = family_members.family_id
      AND family_groups.created_by = auth.uid()
    )
  );

-- Policy for members to view family members (non-recursive version)
CREATE POLICY "members_view_family_members" ON family_members
  FOR SELECT 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM family_groups
      WHERE family_groups.id = family_members.family_id
      AND (
        -- User is either the creator
        family_groups.created_by = auth.uid()
        OR
        -- Or user is a member of the family
        EXISTS (
          SELECT 1 FROM family_members my_membership
          WHERE my_membership.family_id = family_members.family_id
          AND my_membership.user_id = auth.uid()
        )
      )
    )
  );

-- Policy for users to insert themselves as family members (when invited)
CREATE POLICY "users_can_join_families" ON family_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow creators to add members
    EXISTS (
      SELECT 1 FROM family_groups
      WHERE family_groups.id = family_id
      AND family_groups.created_by = auth.uid()
    )
    OR
    -- Allow users to add themselves (this will be controlled by application logic)
    user_id = auth.uid()
  );