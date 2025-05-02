import React, { useState, useEffect } from 'react';
import { Users, Mail, Check, X, User, Shield, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface InviterInfo {
  id: string;
  display_name: string;
  avatar_url: string | null;
}

interface FamilyInfo {
  id: string;
  name: string;
  created_at: string;
  member_count: number;
}

interface InvitationReceived {
  id: string;
  email: string;
  role: string;
  created_at: string;
  inviter: InviterInfo | null;
  family: FamilyInfo | null;
}

const InvitationsReceived: React.FC = () => {
  const { user } = useAuth();
  const [receivedInvitations, setReceivedInvitations] = useState<InvitationReceived[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedInvitation, setExpandedInvitation] = useState<string | null>(null);

  // Fetch invitations received by the current user
  const fetchReceivedInvitations = async () => {
    if (!user || !user.email) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const { data: invitations, error: invitationsError } = await supabase
        .from('family_invitations')
        .select('*')
        .ilike('email', user.email.toLowerCase())
        .eq('accepted', false);
        
      if (invitationsError) throw invitationsError;
      
      if (!invitations || invitations.length === 0) {
        setReceivedInvitations([]);
        setLoading(false);
        return;
      }
      
      // For each invitation, get information about the inviter and family
      const enrichedInvitations = await Promise.all(invitations.map(async (invitation) => {
        // Get inviter info
        const { data: inviterData } = await supabase
          .from('user_profiles')
          .select('display_name, avatar_url')
          .eq('user_id', invitation.created_by)
          .single();
          
        // Get family info
        const { data: familyData } = await supabase
          .from('family_groups')
          .select('name, created_at')
          .eq('id', invitation.family_id)
          .single();
          
        // Count family members
        const { count: memberCount } = await supabase
          .from('family_members')
          .select('id', { count: 'exact' })
          .eq('family_id', invitation.family_id);
          
        return {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          created_at: invitation.created_at,
          inviter: inviterData ? {
            id: invitation.created_by,
            display_name: inviterData.display_name,
            avatar_url: inviterData.avatar_url
          } : null,
          family: familyData ? {
            id: invitation.family_id,
            name: familyData.name,
            created_at: familyData.created_at,
            member_count: memberCount || 0
          } : null
        };
      }));
      
      setReceivedInvitations(enrichedInvitations);
    } catch (err: any) {
      console.error('Error fetching received invitations:', err);
      setError(err.message || 'Failed to load invitations');
    } finally {
      setLoading(false);
    }
  };

  // Load invitations when component mounts
  useEffect(() => {
    if (user) {
      fetchReceivedInvitations();
    }
  }, [user]);

  // Function to accept invitation
  const handleAcceptInvitation = async (invitationId: string) => {
    if (!user) return;
    
    try {
      setError(null);
      
      // Get the invitation details
      const { data: invitation } = await supabase
        .from('family_invitations')
        .select('family_id, role')
        .eq('id', invitationId)
        .single();
        
      if (!invitation) {
        throw new Error('Invitation not found');
      }
      
      // Add user to family_members
      const { error: memberError } = await supabase
        .from('family_members')
        .insert([{
          family_id: invitation.family_id,
          user_id: user.id,
          role: invitation.role,
          joined_at: new Date().toISOString()
        }]);
        
      if (memberError) throw memberError;
      
      // Mark invitation as accepted
      const { error: updateError } = await supabase
        .from('family_invitations')
        .update({
          accepted: true,
          user_id: user.id
        })
        .eq('id', invitationId);
        
      if (updateError) throw updateError;
      
      // Update local state
      setReceivedInvitations(prev => 
        prev.filter(inv => inv.id !== invitationId)
      );
      
      alert('You have joined the family group!');
      
      // Optional: refresh or redirect
      window.location.href = '/family'; // Redirect to family page
      
    } catch (err: any) {
      console.error('Error accepting invitation:', err);
      setError(err.message || 'Failed to accept invitation');
    }
  };

  // Function to decline invitation
  const handleDeclineInvitation = async (invitationId: string) => {
    if (!confirm('Are you sure you want to decline this invitation?')) return;
    
    try {
      setError(null);
      
      // Delete the invitation
      const { error } = await supabase
        .from('family_invitations')
        .delete()
        .eq('id', invitationId);
        
      if (error) throw error;
      
      // Update local state
      setReceivedInvitations(prev => 
        prev.filter(inv => inv.id !== invitationId)
      );
      
      alert('Invitation declined');
      
    } catch (err: any) {
      console.error('Error declining invitation:', err);
      setError(err.message || 'Failed to decline invitation');
    }
  };

  // Function to view family members
  const handleViewFamilyDetails = async (invitationId: string) => {
    if (expandedInvitation === invitationId) {
      setExpandedInvitation(null); // Collapse if already expanded
      return;
    }
    
    setExpandedInvitation(invitationId);
  };

  // Section to show family members when expanded
  const FamilyDetailsSection: React.FC<{ familyId: string }> = ({ familyId }) => {
    const [members, setMembers] = useState<any[]>([]);
    const [loadingMembers, setLoadingMembers] = useState(true);
    
    useEffect(() => {
      const fetchMembers = async () => {
        try {
          // Get family members
          const { data: membersData, error: membersError } = await supabase
            .from('family_members')
            .select(`
              role,
              user_id,
              joined_at
            `)
            .eq('family_id', familyId);
            
          if (membersError) throw membersError;
          
          if (!membersData || membersData.length === 0) {
            setMembers([]);
            setLoadingMembers(false);
            return;
          }
          
          // Get profile info for each member
          const enrichedMembers = await Promise.all(membersData.map(async (member) => {
            const { data: profileData } = await supabase
              .from('user_profiles')
              .select('display_name, avatar_url')
              .eq('user_id', member.user_id)
              .single();
              
            return {
              role: member.role,
              joined_at: member.joined_at,
              user_id: member.user_id,
              display_name: profileData?.display_name || 'Unknown User',
              avatar_url: profileData?.avatar_url
            };
          }));
          
          setMembers(enrichedMembers);
        } catch (err) {
          console.error('Error fetching family members:', err);
        } finally {
          setLoadingMembers(false);
        }
      };
      
      fetchMembers();
    }, [familyId]);
    
    if (loadingMembers) {
      return (
        <div className="py-3 px-4">
          <div className="animate-pulse flex space-x-4">
            <div className="rounded-full bg-slate-200 h-10 w-10"></div>
            <div className="flex-1 space-y-2 py-1">
              <div className="h-2 bg-slate-200 rounded"></div>
              <div className="h-2 bg-slate-200 rounded"></div>
            </div>
          </div>
        </div>
      );
    }
    
    return (
      <div className="mt-2 p-3 bg-gray-50 rounded-md">
        <h5 className="text-sm font-medium text-gray-700 mb-2">Family Members ({members.length})</h5>
        <div className="space-y-2">
          {members.map((member, index) => (
            <div key={index} className="flex items-center text-sm">
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden mr-2">
                {member.avatar_url ? (
                  <img src={member.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User size={16} className="text-gray-500" />
                )}
              </div>
              <div>
                <span className="font-medium">{member.display_name}</span>
                <div className="flex items-center text-xs text-gray-500">
                  <span>{member.role}</span>
                  {member.role === 'Creator' && (
                    <Shield size={12} className="ml-1 text-primary-500" />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (receivedInvitations.length === 0) {
    return (
      <div className="bg-white rounded-xl p-6 text-center">
        <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <Mail className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-800 mb-2">No Invitations</h3>
        <p className="text-gray-600">
          You don't have any pending family group invitations.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-800">Family Invitations</h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-800">
            You have {receivedInvitations.length} invitation{receivedInvitations.length !== 1 ? 's' : ''}
          </h3>
        </div>
        
        <div className="divide-y divide-gray-200">
          {receivedInvitations.map((invitation) => (
            <div key={invitation.id} className="p-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center">
                  <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 overflow-hidden mr-4">
                    {invitation.inviter?.avatar_url ? (
                      <img src={invitation.inviter.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Users size={24} />
                    )}
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-800">
                      {invitation.family?.name || 'Family Group'}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {invitation.inviter ? (
                        <>Invited by {invitation.inviter.display_name}</>
                      ) : (
                        <>Invitation from unknown user</>
                      )}
                    </p>
                    <div className="flex items-center text-xs text-gray-500 mt-1">
                      <span>Role: {invitation.role}</span>
                      <span className="mx-1">•</span>
                      <span>
                        {new Date(invitation.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleViewFamilyDetails(invitation.id)}
                    className="p-2 text-gray-500 hover:text-primary-600 rounded-full hover:bg-gray-100"
                    title="View family members"
                  >
                    <Info size={18} />
                  </button>
                  <button
                    onClick={() => handleAcceptInvitation(invitation.id)}
                    className="p-2 text-green-500 hover:text-green-600 rounded-full hover:bg-green-50"
                    title="Accept invitation"
                  >
                    <Check size={18} />
                  </button>
                  <button
                    onClick={() => handleDeclineInvitation(invitation.id)}
                    className="p-2 text-red-500 hover:text-red-600 rounded-full hover:bg-red-50"
                    title="Decline invitation"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
              
              {expandedInvitation === invitation.id && invitation.family && (
                <FamilyDetailsSection familyId={invitation.family.id} />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default InvitationsReceived;