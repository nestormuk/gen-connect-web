import React, { useState, useEffect } from 'react';
import { Users, Mail, Plus, Edit, Trash2, UserPlus, RefreshCw } from 'lucide-react';
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

interface Invitation {
  id: string;
  family_id: string;
  email: string;
  role: string;
  created_by: string;
  created_at: string;
  accepted: boolean;
  user_id?: string; // Optional field for when invitation is accepted
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

// Component to display all invitations (both pending and accepted)
const InvitationsList: React.FC<{
  pendingInvitations: Invitation[];
  acceptedInvitations: Invitation[];
  onCancel: (id: string) => void;
}> = ({ pendingInvitations, acceptedInvitations, onCancel }) => {
  const allInvitations = [...pendingInvitations, ...acceptedInvitations];
  
  if (!allInvitations || allInvitations.length === 0) return null;
  
  return (
    <div className="mt-6">
      <h3 className="text-lg font-semibold text-gray-700 mb-3">
        Family Invitations ({allInvitations.length})
      </h3>
      
      <div className="space-y-3">
        {pendingInvitations.length > 0 && (
          <div className="mb-2">
            <h4 className="text-md font-medium text-gray-700 mb-2">Pending ({pendingInvitations.length})</h4>
            <div className="space-y-2">
              {pendingInvitations.map(invitation => (
                <div 
                  key={invitation.id} 
                  className="bg-primary-50 rounded-lg p-4 flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600">
                      <Mail size={20} />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-800">{invitation.email}</h4>
                      <div className="flex items-center text-sm">
                        <span className="text-primary-600">{invitation.role}</span>
                        <span className="mx-1">•</span>
                        <span className="text-gray-500">Pending</span>
                      </div>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => onCancel(invitation.id)} 
                    className="p-2 text-gray-400 hover:text-error-600 rounded-full hover:bg-error-50"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {acceptedInvitations.length > 0 && (
          <div>
            <h4 className="text-md font-medium text-gray-700 mb-2">Accepted ({acceptedInvitations.length})</h4>
            <div className="space-y-2">
              {acceptedInvitations.map(invitation => (
                <div 
                  key={invitation.id} 
                  className="bg-green-50 rounded-lg p-4 flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                      <Users size={20} />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-800">{invitation.email}</h4>
                      <div className="flex items-center text-sm">
                        <span className="text-green-600">{invitation.role}</span>
                        <span className="mx-1">•</span>
                        <span className="text-gray-500">Joined</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const FamilyPage: React.FC = () => {
  const { user, checkPendingInvitations } = useAuth();
  const [familyGroup, setFamilyGroup] = useState<FamilyGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Family Member');
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingInvitations, setPendingInvitations] = useState<Invitation[]>([]);
  const [acceptedInvitations, setAcceptedInvitations] = useState<Invitation[]>([]);

  // Function to fetch all invitations (both pending and accepted)
  const fetchAllInvitations = async () => {
    if (!familyGroup) return;
    
    try {
      // Fetch pending invitations
      const { data: pendingData, error: pendingError } = await supabase
        .from('family_invitations')
        .select('*')
        .eq('family_id', familyGroup.id)
        .eq('accepted', false);
        
      if (pendingError) throw pendingError;
      
      // Fetch accepted invitations
      const { data: acceptedData, error: acceptedError } = await supabase
        .from('family_invitations')
        .select('*')
        .eq('family_id', familyGroup.id)
        .eq('accepted', true);
        
      if (acceptedError) throw acceptedError;
      
      setPendingInvitations(pendingData || []);
      setAcceptedInvitations(acceptedData || []);
      
      console.log('Fetched invitations:', {
        pending: pendingData?.length || 0,
        accepted: acceptedData?.length || 0
      });
    } catch (err) {
      console.error('Error fetching invitations:', err);
    }
  };

  const fetchFamilyData = async () => {
    if (!user) return;
  
    try {
      console.log('Fetching family data for user:', user.id);
      
      // First get the user's family membership
      const { data: membershipData, error: membershipError } = await supabase
        .from('family_members')
        .select('family_id, role')
        .eq('user_id', user.id);
  
      if (membershipError) {
        console.error('Error fetching membership:', membershipError);
        setLoading(false);
        return;
      }
  
      console.log('Membership data:', membershipData);
  
      // If no memberships found or empty array, return early
      if (!membershipData || membershipData.length === 0) {
        console.log('No family memberships found for user');
        setLoading(false);
        // Check if there are any pending invitations for this user
        if (user.email) {
          const invited = await checkPendingInvitations(user.email, user.id);
          if (invited) {
            // If invitations were processed, try fetching family data again
            console.log('Processed invitations, retrying family data fetch');
            const { data: retryMembershipData } = await supabase
              .from('family_members')
              .select('family_id, role')
              .eq('user_id', user.id);
              
            if (!retryMembershipData || retryMembershipData.length === 0) {
              console.log('Still no memberships after invitation check');
              return;
            }
            
            // Continue with the membership found after invitation check
            membershipData = retryMembershipData;
          } else {
            return;
          }
        } else {
          return;
        }
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
  
      console.log('Members data:', membersData);
      
      // Also fetch all invitations for this family
      await fetchAllInvitations();
  
      // For each member, fetch their profile data
      const formattedMembers = await Promise.all(membersData.map(async (member) => {
        // Get user profile
        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('display_name, avatar_url')
          .eq('user_id', member.user_id)
          .single();

        // Since we can't access auth.admin, we need a different approach
        // Option 1: Get the email from family_invitations that have been accepted
        let email = 'No email';
        try {
          const { data: invitationData } = await supabase
            .from('family_invitations')
            .select('email')
            .eq('family_id', member.family_id)
            .eq('accepted', true)
            .order('created_at', { ascending: false })
            .limit(1);
            
          if (invitationData && invitationData.length > 0) {
            email = invitationData[0].email;
          } else {
            // Option 2: If this is the creator, we can use the current user's email
            if (member.user_id === user.id) {
              email = user.email || 'No email';
            }
          }
        } catch (e) {
          console.log('Could not fetch email:', e);
        }

        return {
          id: member.id,
          name: profileData?.display_name || 'Unknown User',
          email: email,
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

  // Function to refresh family data
  const refreshFamilyData = async () => {
    setLoading(true);
    await fetchFamilyData();
    await fetchAllInvitations();
    setLoading(false);
  };

  useEffect(() => {
    if (user) {
      fetchFamilyData();
    }
  }, [user]);

  useEffect(() => {
    if (familyGroup) {
      fetchAllInvitations();
    }
  }, [familyGroup]);

  const handleCreateFamily = async () => {
    if (!user) {
      setError("Please sign in to create a family group");
      return;
    }

    try {
      setCreating(true);
      setError(null);
      
      // Create new family group - simplified approach
      const { data: familyData, error: familyError } = await supabase
        .from('family_groups')
        .insert([
          { 
            name: 'My Family', 
            created_by: user.id 
          }
        ])
        .select();

      if (familyError) {
        console.error("Family creation error:", familyError);
        throw new Error(familyError.message || "Failed to create family group");
      }

      if (!familyData || familyData.length === 0) {
        throw new Error("Family creation failed - no data returned");
      }

      const newFamilyId = familyData[0].id;

      // Add creator as first member
      const { data: memberData, error: memberError } = await supabase
        .from('family_members')
        .insert([
          {
            family_id: newFamilyId,
            user_id: user.id,
            role: 'Creator',
            joined_at: new Date().toISOString()
          }
        ])
        .select();

      if (memberError) {
        // If member creation fails, clean up the family group
        await supabase
          .from('family_groups')
          .delete()
          .eq('id', newFamilyId);
          
        throw new Error(memberError.message || "Failed to add you as family member");
      }

      // Get the user's display name
      const { data: userData } = await supabase
        .from('user_profiles')
        .select('display_name, avatar_url, email')
        .eq('user_id', user.id)
        .single();

      // Create the family group object with the creator as the only member
      setFamilyGroup({
        id: newFamilyId,
        name: 'My Family',
        created_at: new Date().toISOString(),
        members: [{
          id: memberData[0].id,
          name: userData?.display_name || 'You',
          email: userData?.email || user.email || 'No email',
          role: 'Creator',
          avatar_url: userData?.avatar_url,
          joined_at: new Date().toISOString()
        }]
      });

      setIsCreator(true);
    } catch (err: any) {
      console.error('Error creating family:', err);
      setError(err.message || 'Failed to create family group. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this family member?')) return;

    try {
      setError(null);
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
    } catch (error: any) {
      console.error('Error removing member:', error);
      setError(error.message || 'Failed to remove member. Please try again.');
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    if (!confirm('Are you sure you want to cancel this invitation?')) return;
    
    try {
      setError(null);
      const { error } = await supabase
        .from('family_invitations')
        .delete()
        .eq('id', invitationId);
        
      if (error) throw error;
      
      // Update the pending invitations list
      setPendingInvitations(pendingInvitations.filter(inv => inv.id !== invitationId));
      
    } catch (error: any) {
      console.error('Error canceling invitation:', error);
      setError(error.message || 'Failed to cancel invitation. Please try again.');
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!familyGroup || !user) return;
  
    setInviting(true);
    setError(null);
    
    try {
      const cleanEmail = inviteEmail.toLowerCase().trim();
      
      // Check if email is already in pending or accepted invitations
      const existingPending = pendingInvitations.find(inv => 
        inv.email.toLowerCase() === cleanEmail
      );
      
      const existingAccepted = acceptedInvitations.find(inv => 
        inv.email.toLowerCase() === cleanEmail
      );
      
      if (existingPending) {
        alert(`${inviteEmail} is already invited to this family group.`);
        setInviting(false);
        setInviteEmail('');
        setShowInviteForm(false);
        return;
      }
      
      if (existingAccepted) {
        alert(`${inviteEmail} has already joined this family group.`);
        setInviting(false);
        setInviteEmail('');
        setShowInviteForm(false);
        return;
      }
      
      // Save the email to family_invitations
      const { data: newInvitation, error: inviteError } = await supabase
        .from('family_invitations')
        .insert([{
          family_id: familyGroup.id,
          email: cleanEmail,
          role: inviteRole,
          created_by: user.id,
          created_at: new Date().toISOString(),
          accepted: false
        }])
        .select();
        
      if (inviteError) throw inviteError;
      
      // Update the pending invitations list
      if (newInvitation && newInvitation.length > 0) {
        setPendingInvitations([...pendingInvitations, newInvitation[0]]);
      }
      
      // Show success message
      alert(`${inviteEmail} added to family group! They'll be automatically added when they register.`);
      
      setInviteEmail('');
      setShowInviteForm(false);
      
    } catch (error: any) {
      console.error('Error adding email:', error);
      setError(error.message || 'Failed to add email. Please try again.');
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
        
        <div className="flex space-x-2">
          <button 
            onClick={refreshFamilyData}
            className="btn-outline flex items-center"
          >
            <RefreshCw size={16} className="mr-2" />
            Refresh
          </button>
          
          {familyGroup && (
            <button 
              onClick={() => setShowInviteForm(true)}
              className="btn-primary flex items-center"
            >
              <UserPlus size={18} className="mr-2" />
              Add Family Member
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
          <span className="block sm:inline">{error}</span>
          <span className="absolute top-0 bottom-0 right-0 px-4 py-3" onClick={() => setError(null)}>
            <svg className="fill-current h-6 w-6 text-red-500" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
              <title>Close</title>
              <path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/>
            </svg>
          </span>
        </div>
      )}

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
          
          {/* Add the invitations list component here */}
          <InvitationsList 
            pendingInvitations={pendingInvitations}
            acceptedInvitations={acceptedInvitations}
            onCancel={handleCancelInvitation} 
          />
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
            disabled={creating}
            className="btn-primary inline-flex items-center"
          >
            {creating ? (
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></div>
            ) : (
              <Plus size={18} className="mr-2" />
            )}
            {creating ? 'Creating...' : 'Create Family Group'}
          </button>
        </div>
      )}

      {/* Simplified Invite Member Dialog */}
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
              Add Family Member by Email
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
                    'Add to Family'
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