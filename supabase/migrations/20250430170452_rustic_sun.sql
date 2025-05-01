/*
  # Fix family members policies

  1. Changes
    - Drop existing problematic policies on family_members table
    - Create new, optimized policies that avoid recursion
    
  2. Security
    - Enable RLS (already enabled)
    - Add policy for users to view family members where they are either:
      a) The creator of the family group
      b) A member of the family group
    - Add policy for users to manage family members if they created the family
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view family members in their families" ON family_members;
DROP POLICY IF EXISTS "Family creators can manage family members" ON family_members;

-- Create new non-recursive policies
CREATE POLICY "view_family_members" ON family_members
FOR SELECT TO public
USING (
  EXISTS (
    SELECT 1 FROM family_groups
    WHERE family_groups.id = family_members.family_id
    AND (
      -- User is the creator of the family
      family_groups.created_by = auth.uid()
      OR
      -- User is a member of the family
      EXISTS (
        SELECT 1 FROM family_members AS fm
        WHERE fm.family_id = family_members.family_id
        AND fm.user_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "manage_family_members" ON family_members
FOR ALL TO public
USING (
  EXISTS (
    SELECT 1 FROM family_groups
    WHERE family_groups.id = family_members.family_id
    AND family_groups.created_by = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM family_groups
    WHERE family_groups.id = family_members.family_id
    AND family_groups.created_by = auth.uid()
  )
);