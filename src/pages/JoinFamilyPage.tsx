import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const JoinFamilyPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const invitationCode = searchParams.get('code');
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invitation, setInvitation] = useState<any>(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    const verifyInvitation = async () => {
      if (!invitationCode) {
        setError('Invalid invitation link');
        setLoading(false);
        return;
      }

      try {
        // Fetch invitation details
        const { data, error } = await supabase
          .from('family_invitations')
          .select('*, family_groups(name)')
          .eq('invitation_code', invitationCode)
          .single();

        if (error) throw error;
        
        if (!data) {
          setError('Invitation not found or expired');
          setLoading(false);
          return;
        }
        
        if (data.accepted) {
          setError('This invitation has already been used');
          setLoading(false);
          return;
        }
        
        if (new Date(data.expires_at) < new Date()) {
          setError('This invitation has expired');
          setLoading(false);
          return;
        }
        
        setInvitation(data);
      } catch (err: any) {
        console.error('Error verifying invitation:', err);
        setError(err.message || 'Failed to verify invitation');
      } finally {
        setLoading(false);
      }
    };

    verifyInvitation();
  }, [invitationCode]);

  const handleJoinFamily = async () => {
    if (!user || !invitation) return;
    
    setJoining(true);
    try {
      // Check if already a member
      const { data: existingMember } = await supabase
        .from('family_members')
        .select('id')
        .eq('family_id', invitation.family_id)
        .eq('user_id', user.id)
        .single();
        
      if (existingMember) {
        // Already a member, just navigate to family page
        navigate('/family');
        return;
      }
      
      // Add user to family members
      const { error: memberError } = await supabase
        .from('family_members')
        .insert([{
          family_id: invitation.family_id,
          user_id: user.id,
          role: invitation.role
        }]);
        
      if (memberError) throw memberError;
      
      // Mark invitation as accepted
      await supabase
        .from('family_invitations')
        .update({ accepted: true })
        .eq('id', invitation.id);
        
      // Navigate to family page
      navigate('/family');
      
    } catch (err: any) {
      console.error('Error joining family:', err);
      setError(err.message || 'Failed to join family');
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-red-600 mb-4">Invitation Error</h2>
        <p className="text-gray-700 mb-6">{error}</p>
        <button 
          onClick={() => navigate('/')}
          className="btn-primary w-full"
        >
          Return Home
        </button>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Join Family</h2>
        <p className="text-gray-700 mb-6">
          Please sign in or create an account to join {invitation?.family_groups?.name || 'this family'}.
        </p>
        <div className="space-y-3">
          <button 
            onClick={() => navigate('/login?redirect=' + encodeURIComponent(window.location.pathname + window.location.search))}
            className="btn-primary w-full"
          >
            Sign In
          </button>
          <button
            onClick={() => navigate('/signup?redirect=' + encodeURIComponent(window.location.pathname + window.location.search))}
            className="btn-outline w-full"
          >
            Create Account
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Join Family</h2>
      <p className="text-gray-700 mb-6">
        You've been invited to join {invitation?.family_groups?.name || 'a family'} as a {invitation?.role}.
      </p>
      <button
        onClick={handleJoinFamily}
        disabled={joining}
        className="btn-primary w-full"
      >
        {joining ? 'Joining...' : 'Accept & Join Family'}
      </button>
    </div>
  );
};

export default JoinFamilyPage;