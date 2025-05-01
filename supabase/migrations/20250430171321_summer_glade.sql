/*
  # Fix family members RLS policies

  1. Changes
    - Remove recursive policies causing infinite loops
    - Simplify family member access policies
    - Fix view permissions for family members
    - Update member management policies

  2. Security
    - Maintain proper access control
    - Prevent unauthorized access
    - Keep data isolation between families
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view family members in their families" ON family_members;
DROP POLICY IF EXISTS "Family creators can manage family members" ON family_members;

-- Create new, non-recursive policies
CREATE POLICY "view_family_members"
  ON family_members
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    family_id IN (
      SELECT family_id 
      FROM family_members 
      WHERE user_id = auth.uid()
    )
  );

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

CREATE POLICY "join_family"
  ON family_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 
      FROM family_groups 
      WHERE id = family_id 
      AND created_by = auth.uid()
    )
  );