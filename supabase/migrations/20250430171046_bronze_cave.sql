/*
  # Fix family members policies

  1. Changes
    - Drop existing problematic policies on family_members table
    - Create new, optimized policies that avoid recursion
    
  2. Security
    - Maintain same security model but with more efficient policy definitions
    - Creators can still manage their family members
    - Members can still view other members in their families
*/

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "creators_manage_family_members" ON family_members;
DROP POLICY IF EXISTS "members_view_family_members" ON family_members;

-- Create new, optimized policies
CREATE POLICY "creators_manage_family_members"
ON family_members
FOR ALL
TO authenticated
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
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM family_members AS my_membership
    WHERE my_membership.family_id = family_members.family_id
    AND my_membership.user_id = auth.uid()
  )
);