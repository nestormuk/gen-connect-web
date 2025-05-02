import React, { useState, useEffect } from 'react';
import { Users, Mail, Check, ChevronLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';

interface FamilyMember {
  id: string;
  user_id: string;
  role: string;
  email: string; // We'll store email here for display
}

interface Invitation {
  id: string;
  family_id: string;
  family_name: string;
  email: string;
  role: string;
  created_at: string;
  created_by: string;
  inviter_email: string; // Store the inviter's email
  accepted: boolean;
  members: FamilyMember[];
}

const MyInvitationsPage: React.FC = () => {
  const { user } = useAuth();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchInvitations = async () => {
      if (!user || !user.email) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // Get all invitations for this user's email
        const { data: invitationsData, error: invitationsError } = await supabase
          .from('family_invitations')
          .select(`
            id,
            family_id,
            email,
            role,
            created_at,
            created_by,
            accepted
          `)
          .ilike('email', user.email.toLowerCase().trim());
        
        if (invitationsError) throw invitationsError;
        
        if (!invitationsData || invitationsData.length === 0) {
          setInvitations([]);
          setLoading(false);
          return;
        }
        
        // Fetch extended data for each invitation
        const extendedInvitations = await Promise.all(invitationsData.map(async (invitation) => {
          // Get family group info
          const { data: familyData } = await supabase
            .from('family_groups')
            .select('id, name')
            .eq('id', invitation.family_id)
            .single();
          
          // Get inviter's email from their invitation or directly
          let inviterEmail = "Unknown";
          
          // Try to get inviter's email from family_invitations for the creator
          const { data: creatorInvitation } = await supabase
            .from('family_invitations')
            .select('email')
            .eq('created_by', invitation.created_by)
            .limit(1);
            
          if (creatorInvitation && creatorInvitation.length > 0) {
            inviterEmail = creatorInvitation[0].email;
          } else if (invitation.created_by === user.id) {
            // If the current user is the creator
            inviterEmail = user.email || "You";
          }
          
          // Get all members of this family through their invitations
          const { data: familyInvitations } = await supabase
            .from('family_invitations')
            .select(`
              id,
              email,
              role,
              accepted,
              user_id
            `)
            .eq('family_id', invitation.family_id)
            .eq('accepted', true);
          
          // Also get members who might not have invitations record
          const { data: familyMembers } = await supabase
            .from('family_members')
            .select(`
              id,
              role,
              user_id
            `)
            .eq('family_id', invitation.family_id);
          
          // Create a map of members with emails from invitations
          const memberMap: Record<string, FamilyMember> = {};
          
          // First add all accepted invitations
          (familyInvitations || []).forEach(inv => {
            if (inv.user_id) {
              memberMap[inv.user_id] = {
                id: inv.id,
                user_id: inv.user_id,
                role: inv.role,
                email: inv.email
              };
            }
          });
          
          // Add any additional members without duplicating
          const membersWithEmails = (familyMembers || []).map(member => {
            // If we already have this member with email from invitation, use that
            if (memberMap[member.user_id]) {
              return memberMap[member.user_id];
            }
            
            // Otherwise create a new entry with default email
            return {
              id: member.id,
              user_id: member.user_id,
              role: member.role,
              email: member.user_id === user.id ? (user.email || "You") : "Member"
            };
          });
          
          return {
            ...invitation,
            family_name: familyData?.name || 'Unknown Family',
            inviter_email: inviterEmail,
            members: Object.values(memberMap).length > 0 
              ? Object.values(memberMap) 
              : membersWithEmails
          };
        }));
        
        setInvitations(extendedInvitations);
      } catch (err: any) {
        console.error('Error fetching invitations:', err);
        setError(err.message || 'Failed to load invitations');
      } finally {
        setLoading(false);
      }
    };
    
    fetchInvitations();
  }, [user]);
  
  const handleAcceptInvitation = async (invitationId: string) => {
    // Find the invitation in state
    const invitation = invitations.find(inv => inv.id === invitationId);
    if (!invitation || !user) return;
    
    try {
      setAcceptingId(invitationId);
      
      // Check if user is already a member
      const { data: existingMember } = await supabase
        .from('family_members')
        .select('id')
        .eq('family_id', invitation.family_id)
        .eq('user_id', user.id)
        .maybeSingle();
        
      if (existingMember) {
        alert('You are already a member of this family.');
        setAcceptingId(null);
        return;
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
      
      alert(`You've successfully joined the ${invitation.family_name} family!`);
      
      // Update local state to reflect the change
      setInvitations(invitations.map(inv => 
        inv.id === invitationId 
          ? { ...inv, accepted: true }
          : inv
      ));
      
    } catch (error: any) {
      console.error('Error accepting invitation:', error);
      alert('Failed to accept the invitation. Please try again.');
    } finally {
      setAcceptingId(null);
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
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center mb-6">
        <Link to="/" className="mr-4 p-2 rounded-full hover:bg-gray-100">
          <ChevronLeft size={20} className="text-gray-600" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-800">My Family Invitations</h1>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      
      {invitations.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-md">
          <div className="mx-auto w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mb-4">
            <Mail className="h-8 w-8 text-primary-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">No Invitations Yet</h3>
          <p className="text-gray-600 max-w-md mx-auto">
            You haven't been invited to any family groups yet.
          </p>
        </div>
      ) : (
        <div>
          <p className="text-gray-600 mb-4">
            You have been invited to {invitations.length} family group{invitations.length !== 1 ? 's' : ''}.
          </p>
          
          {invitations.map(invitation => (
            <div key={invitation.id} className="bg-white rounded-lg shadow-sm p-5 mb-4">
              <div className="border-b pb-4 mb-4">
                <h3 className="text-xl font-semibold text-gray-800 mb-1">
                  {invitation.family_name}
                </h3>
                
                <div className="flex items-center text-gray-600 mb-2">
                  <Users size={16} className="mr-2 text-primary-500" />
                  <span>
                    Invited by <span className="font-medium">{invitation.inviter_email}</span>
                  </span>
                </div>
                
                <div className="text-sm text-gray-500">
                  <span className="inline-block mr-3">
                    Role: <span className="font-medium text-primary-600">{invitation.role}</span>
                  </span>
                  <span className="inline-block">
                    Invited on {new Date(invitation.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
              
              {invitation.members.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-700 flex items-center mb-3">
                    <Users size={16} className="mr-2 text-gray-500" />
                    Family Members ({invitation.members.length})
                  </h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {invitation.members.map((member, index) => (
                      <div key={index} className="flex items-center space-x-3 p-2 rounded-md hover:bg-gray-50">
                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 overflow-hidden">
                          <Mail size={18} />
                        </div>
                        <div>
                          <div className="font-medium text-gray-800">{member.email}</div>
                          <div className="text-xs text-gray-500">{member.role}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {!invitation.accepted && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => handleAcceptInvitation(invitation.id)}
                    disabled={acceptingId === invitation.id}
                    className="btn-primary flex items-center mx-auto"
                  >
                    {acceptingId === invitation.id ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></div>
                    ) : (
                      <Check size={18} className="mr-2" />
                    )}
                    {acceptingId === invitation.id ? 'Joining...' : 'Accept Invitation'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyInvitationsPage;