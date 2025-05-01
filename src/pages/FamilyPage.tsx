import React, { useState, useEffect } from 'react';
import { Users, Mail, Plus, Edit, Trash2, UserPlus } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface FamilyMember {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar_url: string | null;
  joined_at: string;
}

interface FamilyGroup {
  id: string;
  name: string;
  created_at: string;
  members: FamilyMember[];
}

const FamilyMemberCard: React.FC<{ 
  member: FamilyMember;
  onRemove: (id: string) => void;
  isCreator: boolean;
}> = ({ member, onRemove, isCreator }) => {
  return (
    <motion.div 
      className="bg-white rounded-lg shadow-sm p-4 flex items-center justify-between"
      whileHover={{ y: -3 }}
      transition={{ type: 'spring', stiffness: 300 }}
    >
      <div className="flex items-center space-x-3">
        <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 overflow-hidden">
          {member.avatar_url ? (
            <img src={member.avatar_url} alt={member.name} className="w-full h-full object-cover" />
          ) : (
            <Users size={24} />
          )}
        </div>
        <div>
          <h3 className="font-medium text-gray-800">{member.name}</h3>
          <div className="flex items-center text-sm">
            <span className="text-gray-500">{member.email}</span>
            <span className="mx-1">•</span>
            <span className="text-primary-600">{member.role}</span>
          </div>
        </div>
      </div>
      {isCreator && member.role !== 'Creator' && (
        <button 
          onClick={() => onRemove(member.id)} 
          className="p-2 text-gray-400 hover:text-error-600 rounded-full hover:bg-error-50"
        >
          <Trash2 size={18} />
        </button>
      )}
    </motion.div>
  );
};

const FamilyPage: React.FC = () => {
  const { user } = useAuth();
  const [familyGroup, setFamilyGroup] = useState<FamilyGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Family Member');
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [isCreator, setIsCreator] = useState(false);

  useEffect(() => {
    const fetchFamilyData = async () => {
      if (!user) return;

      try {
        // First get the user's family membership
        const { data: membershipData, error: membershipError } = await supabase
          .from('family_members')
          .select('family_id, role')
          .eq('user_id', user.id);

        // Handle the case where the user has no family membership
        if (membershipError) {
          console.error('Error fetching membership:', membershipError);
          setLoading(false);
          return;
        }

        // If no memberships found or empty array, return early
        if (!membershipData || membershipData.length === 0) {
          console.log('No family memberships found for user');
          setLoading(false);
          return;
        }

        // Take the first membership (in case there are multiple)
        const membership = membershipData[0];

        // Then get the family group details
        const { data: familyData, error: familyError } = await supabase
          .from('family_groups')
          .select('*, created_by')
          .eq('id', membership.family_id)
          .single();

        if (familyError) {
          console.error('Error fetching family:', familyError);
          setLoading(false);
          return;
        }

        // Get all family members
        const { data: membersData, error: membersError } = await supabase
          .from('family_members')
          .select(`
            id,
            role,
            joined_at,
            user_id,
            family_id
          `)
          .eq('family_id', membership.family_id);

        if (membersError) {
          console.error('Error fetching members:', membersError);
          setLoading(false);
          return;
        }

        // For each member, fetch their profile and auth data
        const formattedMembers = await Promise.all(membersData.map(async (member) => {
          // Get user profile
          const { data: profileData } = await supabase
            .from('user_profiles')
            .select('display_name, avatar_url')
            .eq('user_id', member.user_id)
            .single();

          // Get user email
          const { data: userData } = await supabase
            .from('users')
            .select('email')
            .eq('id', member.user_id)
            .single();

          return {
            id: member.id,
            name: profileData?.display_name || 'Unknown User',
            email: userData?.email || 'No email',
            role: member.role,
            avatar_url: profileData?.avatar_url,
            joined_at: member.joined_at
          };
        }));

        setFamilyGroup({
          id: familyData.id,
          name: familyData.name,
          created_at: familyData.created_at,
          members: formattedMembers
        });

        setIsCreator(familyData.created_by === user.id);
      } catch (error) {
        console.error('Error fetching family data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFamilyData();
  }, [user]);

  const handleCreateFamily = async () => {
    if (!user) {
      console.error("No user object available");
      alert("Please sign in to create a family group");
      return;
    }

    try {
      setLoading(true);
      
      // Debugging: Log the current user information
      console.log("Current user object:", user);
      console.log("Attempting to create family group for user ID:", user.id);

      // Verify user exists in auth.users table
      const { data: authUserData, error: authUserError } = await supabase
        .from('auth.users')
        .select('id')
        .eq('id', user.id)
        .single();

      console.log("Auth user verification:", { data: authUserData, error: authUserError });
      
      if (authUserError) {
        console.error("User verification error:", authUserError);
        // Try alternative table if schema is different
        const { data: altUserData, error: altUserError } = await supabase
          .from('users')
          .select('id')
          .eq('id', user.id)
          .single();
          
        console.log("Alternative user verification:", { data: altUserData, error: altUserError });
        
        if (altUserError) {
          throw new Error("User ID verification failed. You may not have proper database access.");
        }
      }

      // Test read permission for family_groups table
      const { data: testReadData, error: testReadError } = await supabase
        .from('family_groups')
        .select('id')
        .limit(1);
      
      console.log("Table read test:", { 
        canReadFamilyGroups: !testReadError, 
        data: testReadData, 
        error: testReadError 
      });

      if (testReadError) {
        console.error("Permission issue: Cannot read from family_groups table");
        throw new Error("Database permission error. Cannot access family_groups table.");
      }

      // Create new family group
      const { data: familyData, error: familyError } = await supabase
        .from('family_groups')
        .insert([
          { 
            name: 'My Family', 
            created_by: user.id 
          }
        ])
        .select();

      console.log("Family creation response:", { data: familyData, error: familyError });

      if (familyError) {
        console.error("Family creation error:", familyError);
        
        // Test specific insert values to identify constraint issues
        const testInsert = {
          name: 'My Family', 
          created_by: user.id
        };
        console.log("Attempted insert data:", testInsert);
        
        // Check if the created_by field is a UUID
        const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id);
        console.log("Is user.id a valid UUID?", isValidUUID);
        
        throw familyError;
      }

      if (!familyData || familyData.length === 0) {
        console.error("No family data returned after insert");
        throw new Error("Family creation failed - no data returned");
      }

      const newFamilyId = familyData[0].id;
      console.log("Family created with ID:", newFamilyId);

      // Test family_members read permission before insert
      const { data: testMembersData, error: testMembersError } = await supabase
        .from('family_members')
        .select('id')
        .limit(1);
        
      console.log("Can read family_members table:", { 
        success: !testMembersError, 
        data: testMembersData, 
        error: testMembersError 
      });

      // Add creator as first member
      const { data: memberData, error: memberError } = await supabase
        .from('family_members')
        .insert([
          {
            family_id: newFamilyId,
            user_id: user.id,
            role: 'Creator'
          }
        ])
        .select();

      console.log("Family member creation response:", { data: memberData, error: memberError });

      if (memberError) {
        console.error("Member creation error:", memberError);
        
        // Test if foreign keys exist
        const foreignKeyTest = {
          family_id: newFamilyId,
          user_id: user.id
        };
        console.log("Foreign key test values:", foreignKeyTest);
        
        // Verify family_id exists
        const { data: familyExists, error: familyExistsError } = await supabase
          .from('family_groups')
          .select('id')
          .eq('id', newFamilyId)
          .single();
          
        console.log("Family ID exists check:", { exists: !!familyExists, error: familyExistsError });
        
        // If we got here but member creation failed, we should clean up the created family
        console.log("Attempting to clean up created family group due to member creation failure");
        const { error: cleanupError } = await supabase
          .from('family_groups')
          .delete()
          .eq('id', newFamilyId);
          
        console.log("Cleanup result:", { error: cleanupError });
        
        throw memberError;
      }

      console.log("Family member created successfully:", memberData);

      // Instead of page reload, update the state directly
      // and fetch the updated data
      const fetchNewFamilyData = async () => {
        try {
          // Get the family group details
          const { data: familyData, error: familyError } = await supabase
            .from('family_groups')
            .select('*, created_by')
            .eq('id', newFamilyId)
            .single();

          if (familyError) {
            console.error("Error fetching created family:", familyError);
            throw familyError;
          }

          // Get user profile for the creator - test both possible table paths
          let profileData;
          try {
            const { data, error } = await supabase
              .from('user_profiles')
              .select('display_name, avatar_url')
              .eq('user_id', user.id)
              .single();
              
            profileData = data;
            console.log("Profile data fetch:", { data, error });
          } catch (profileError) {
            console.error("Error fetching profile:", profileError);
            // Try alternative table name or path if needed
          }

          // Get user email - test both possible paths
          let userData;
          try {
            const { data, error } = await supabase
              .from('users')
              .select('email')
              .eq('id', user.id)
              .single();
              
            userData = data;
            console.log("User data fetch:", { data, error });
          } catch (userError) {
            console.error("Error fetching user:", userError);
            // Try alternative
            try {
              const { data, error } = await supabase
                .from('auth.users')
                .select('email')
                .eq('id', user.id)
                .single();
                
              userData = data;
              console.log("Auth user data fetch:", { data, error });
            } catch (authUserError) {
              console.error("Error fetching auth user:", authUserError);
            }
          }

          const creatorMember = {
            id: memberData[0].id,
            name: profileData?.display_name || user.user_metadata?.name || 'You',
            email: userData?.email || user.email || 'No email',
            role: 'Creator',
            avatar_url: profileData?.avatar_url || user.user_metadata?.avatar_url,
            joined_at: memberData[0].joined_at || new Date().toISOString()
          };

          console.log("Created member object:", creatorMember);

          setFamilyGroup({
            id: familyData.id,
            name: familyData.name,
            created_at: familyData.created_at,
            members: [creatorMember]
          });

          setIsCreator(true);
          console.log("Family group state updated successfully");
        } catch (error) {
          console.error('Error fetching new family data:', error);
          // If we can't fetch the data, just reload the page as fallback
          console.log("Falling back to page reload");
          window.location.reload();
        }
      };

      await fetchNewFamilyData();
    } catch (error) {
      console.error('Error creating family:', error);
      alert('Failed to create family group. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this family member?')) return;

    try {
      const { error } = await supabase
        .from('family_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      setFamilyGroup(prev => {
        if (!prev) return null;
        return {
          ...prev,
          members: prev.members.filter(member => member.id !== memberId)
        };
      });
    } catch (error) {
      console.error('Error removing member:', error);
      alert('Failed to remove member. Please try again.');
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!familyGroup) return;

    setInviting(true);
    try {
      // First check if user exists
      const { data: userData, error: userError } = await supabase
        .from('users')  // Changed from 'auth.users' to 'users'
        .select('id')
        .eq('email', inviteEmail)
        .single();

      if (userError || !userData) {
        throw new Error('User not found. Please check the email address.');
      }

      // Check if user is already a member
      const { data: existingMember, error: memberError } = await supabase
        .from('family_members')
        .select('id')
        .eq('family_id', familyGroup.id)
        .eq('user_id', userData.id);

      if (existingMember && existingMember.length > 0) {
        throw new Error('This user is already a member of the family.');
      }

      // Add new member
      const { error: inviteError } = await supabase
        .from('family_members')
        .insert([
          {
            family_id: familyGroup.id,
            user_id: userData.id,
            role: inviteRole
          }
        ]);

      if (inviteError) throw inviteError;

      setInviteEmail('');
      setShowInviteForm(false);
      alert('Member added successfully!');
      
      // Refresh the page to show the new member
      window.location.reload();
    } catch (error: any) {
      console.error('Error inviting member:', error);
      alert(error.message || 'Failed to add member. Please try again.');
    } finally {
      setInviting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Family Group</h1>
        {familyGroup && (
          <button 
            onClick={() => setShowInviteForm(true)}
            className="btn-primary flex items-center"
          >
            <UserPlus size={18} className="mr-2" />
            Invite Member
          </button>
        )}
      </div>

      {familyGroup ? (
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">{familyGroup.name}</h2>
              <p className="text-gray-500 text-sm">
                Created on {new Date(familyGroup.created_at).toLocaleDateString()}
              </p>
            </div>
            {isCreator && (
              <button className="btn-outline flex items-center">
                <Edit size={16} className="mr-2" />
                Edit Group
              </button>
            )}
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-700 mb-3">
              Family Members ({familyGroup.members.length})
            </h3>
            
            {familyGroup.members.map((member) => (
              <FamilyMemberCard 
                key={member.id} 
                member={member} 
                onRemove={handleRemoveMember}
                isCreator={isCreator}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-xl shadow-md">
          <div className="mx-auto w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mb-4">
            <Users className="h-8 w-8 text-primary-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">No Family Group Yet</h3>
          <p className="text-gray-600 max-w-md mx-auto mb-6">
            Create a family group to start sharing stories with your loved ones.
          </p>
          <button 
            onClick={handleCreateFamily}
            className="btn-primary inline-flex items-center"
          >
            <Plus size={18} className="mr-2" />
            Create Family Group
          </button>
        </div>
      )}

      {/* Invite Member Dialog */}
      {showInviteForm && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4">
          <motion.div 
            className="bg-white rounded-xl shadow-xl max-w-md w-full p-6"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
          >
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <UserPlus size={20} className="mr-2 text-primary-500" />
              Invite Family Member
            </h3>
            <form onSubmit={handleInvite}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="email"
                      type="email"
                      required
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="input pl-10"
                      placeholder="family.member@example.com"
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                    Family Role
                  </label>
                  <select
                    id="role"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="input"
                  >
                    <option value="Family Member">Family Member</option>
                    <option value="Grandparent">Grandparent</option>
                    <option value="Parent">Parent</option>
                    <option value="Child">Child</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
              
              <div className="flex justify-end mt-6 space-x-3">
                <button
                  type="button"
                  onClick={() => setShowInviteForm(false)}
                  className="btn bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviting || !inviteEmail}
                  className="btn-primary"
                >
                  {inviting ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                  ) : (
                    'Send Invitation'
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default FamilyPage;