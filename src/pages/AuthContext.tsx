import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: any;
  signIn: (email: string, password: string) => Promise<any>;
  signUp: (email: string, password: string, userData: any) => Promise<any>;
  signOut: () => Promise<void>;
  loading: boolean;
  checkPendingInvitations: (email: string, userId: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Check for invitations based on email
  const checkPendingInvitations = async (email: string, userId: string) => {
    try {
      console.log('Checking pending invitations for email:', email);
      
      // Query the family_invitations table for this email
      const { data: invitations, error: inviteError } = await supabase
        .from('family_invitations')
        .select('*')
        .ilike('email', email.toLowerCase().trim())
        .eq('accepted', false);
      
      if (inviteError) {
        console.error('Error checking invitations:', inviteError);
        return false;
      }
      
      console.log('Found invitations:', invitations);
      
      if (!invitations || invitations.length === 0) {
        return false; // No invitations found
      }
      
      // Process each invitation by adding the user to the family_members table
      let addedToAnyFamily = false;
      
      for (const invitation of invitations) {
        // Check if already a member of this family
        const { data: existingMember } = await supabase
          .from('family_members')
          .select('id')
          .eq('family_id', invitation.family_id)
          .eq('user_id', userId)
          .maybeSingle();
          
        if (existingMember) {
          console.log('Already a member of family:', invitation.family_id);
          continue; // Skip to next invitation
        }
        
        // Add user to the family_members table
        const { error: memberError } = await supabase
          .from('family_members')
          .insert([{
            family_id: invitation.family_id,
            user_id: userId,
            role: invitation.role || 'Family Member',
            joined_at: new Date().toISOString()
          }]);
          
        if (memberError) {
          console.error('Error adding to family:', memberError);
          continue;
        }
        
        // Mark invitation as accepted
// Mark invitation as accepted with user_id
        const { error: updateError } = await supabase
        .from('family_invitations')
        .update({ 
            accepted: true,
            user_id: userId  // Add this line to store the user ID
        })
        .eq('id', invitation.id);
                
        if (updateError) {
          console.error('Error updating invitation:', updateError);
        } else {
          addedToAnyFamily = true;
          console.log('Successfully added to family:', invitation.family_id);
        }
      }
      
      return addedToAnyFamily;
    } catch (error) {
      console.error('Error in checkPendingInvitations:', error);
      return false;
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        // Check active sessions and set the user
        const { data } = await supabase.auth.getSession();
        
        if (data && data.session) {
          setUser(data.session.user);
          
          // Check for pending invitations on page load
          if (data.session.user && data.session.user.email) {
            await checkPendingInvitations(
              data.session.user.email, 
              data.session.user.id
            );
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        
        if (session?.user) {
          setUser(session.user);
          
          // Check for pending invitations on login
          if (event === 'SIGNED_IN' && session.user.email) {
            await checkPendingInvitations(
              session.user.email,
              session.user.id
            );
          }
        } else {
          setUser(null);
        }
        
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      // Check for pending invitations after successful login
      if (data && data.user) {
        await checkPendingInvitations(email, data.user.id);
      }
      
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, userData: any) => {
    try {
      setLoading(true);
      
      // Register user with Supabase
      const { data, error } = await supabase.auth.signUp({ 
        email, 
        password 
      });
      
      if (error) throw error;
      
      if (data.user) {
        const cleanEmail = email.toLowerCase().trim();
        
        // Create user profile 
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert([{
            user_id: data.user.id,
            display_name: userData.display_name,
            created_at: new Date().toISOString()
          }]);
          
        if (profileError) {
          console.error('Error creating user profile:', profileError);
        }
        
        // Check if email was invited to any family groups
        await checkPendingInvitations(cleanEmail, data.user.id);
        
        // Force sign in after signup if verification is not required
        if (!data.session) {
          const { data: signInData } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password
          });
          
          if (signInData && signInData.user) {
            setUser(signInData.user);
          }
        }
      }
      
      return { data, error: null };
    } catch (error: any) {
      console.error('Signup error:', error);
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      signIn, 
      signUp, 
      signOut, 
      loading,
      checkPendingInvitations
    }}>
      {children}
    </AuthContext.Provider>
  );
};