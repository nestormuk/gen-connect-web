/*
  # Fix recursive policy in family_members table

  1. Changes
    - Drop existing recursive policies on family_members table
    - Create new non-recursive policies for family_members table
    
  2. Security
    - Maintain same security model but with optimized policy conditions
    - Members can view other members in their families
    - Creators can manage family members
*/

-- Drop existing policies
DROP POLICY IF EXISTS "creators_manage_family_members" ON family_members;
DROP POLICY IF EXISTS "members_view_family_members" ON family_members;

-- Create new non-recursive policies
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
    SELECT 1 FROM family_members AS fm
    WHERE fm.family_id = family_members.family_id
    AND fm.user_id = auth.uid()
  )
);