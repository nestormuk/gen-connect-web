// Enhanced FamilyInvitationDetails component with accept button
import React from 'react';
import { Users, UserPlus, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const FamilyInvitationDetails = ({ 
  invitation, 
  inviter, 
  members,
  onAccept 
}) => {
  const { user } = useAuth();
  const [accepting, setAccepting] = useState(false);

  const handleAccept = async () => {
    if (!user || !invitation) return;
    
    try {
      setAccepting(true);
      
      // Check if user is already a member
      const { data: existingMember } = await supabase
        .from('family_members')
        .select('id')
        .eq('family_id', invitation.family_id)
        .eq('user_id', user.id)
        .maybeSingle();
        
      if (existingMember) {
        alert('You are already a member of this family.');
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
        .eq('id', invitation.id);
        
      if (updateError) throw updateError;
      
      alert(`You've successfully joined the ${invitation.family_name} family!`);
      
      // Refresh page or update state
      if (onAccept) onAccept(invitation.id);
      
    } catch (error) {
      console.error('Error accepting invitation:', error);
      alert('Failed to accept the invitation. Please try again.');
    } finally {
      setAccepting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-5 mb-4">
      {/* ...existing code... */}
      
      {/* Add accept button for pending invitations */}
      {!invitation.accepted && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <button
            onClick={handleAccept}
            disabled={accepting}
            className="btn-primary flex items-center mx-auto"
          >
            {accepting ? (
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></div>
            ) : (
              <Check size={18} className="mr-2" />
            )}
            {accepting ? 'Joining...' : 'Accept Invitation'}
          </button>
        </div>
      )}
    </div>
  );
};