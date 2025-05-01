/*
  # Fix family_members RLS policies

  1. Changes
    - Drop existing problematic policies on family_members table
    - Create new, optimized policies without recursion
    
  2. Security
    - Maintain same security level but with more efficient policies
    - Users can still only view and manage family members for families they belong to
    - Family creators retain full control
*/

-- Drop existing policies to replace them with optimized versions
DROP POLICY IF EXISTS "manage_family_members" ON family_members;
DROP POLICY IF EXISTS "view_family_members" ON family_members;

-- Create new optimized policies
CREATE POLICY "creators_manage_family_members"
ON family_members
FOR ALL
TO public
USING (
  EXISTS (
    SELECT 1 FROM family_groups
    WHERE family_groups.id = family_members.family_id
    AND family_groups.created_by = auth.uid()
  )
);

CREATE POLICY "members_view_family_members"
ON family_members
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM family_groups
    WHERE family_groups.id = family_members.family_id
    AND (
      family_groups.created_by = auth.uid()
      OR family_members.user_id = auth.uid()
    )
  )
);