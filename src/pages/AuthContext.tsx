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
    if (!email || !userId) {
      console.warn('Cannot check invitations: missing email or userId');
      return false;
    }
    
    try {
      console.log('Checking pending invitations for:', email);
      
      // Query the family_invitations table for this email
      const invitationsResponse = await supabase
        .from('family_invitations')
        .select('*')
        .ilike('email', email.toLowerCase().trim())
        .eq('accepted', false);
      
      if (invitationsResponse.error) {
        console.error('Error querying invitations:', invitationsResponse.error);
        return false;
      }
      
      const invitations = invitationsResponse.data || [];
      console.log(`Found ${invitations.length} pending invitations`);
      
      if (invitations.length === 0) {
        return false; // No invitations found
      }
      
      // Process each invitation
      let addedToAnyFamily = false;
      
      for (const invitation of invitations) {
        // Additional defensive checks
        if (!invitation || !invitation.family_id) {
          console.warn('Skipping invalid invitation:', invitation);
          continue;
        }
        
        try {
          // Check if already a member
          const memberResponse = await supabase
            .from('family_members')
            .select('id')
            .eq('family_id', invitation.family_id)
            .eq('user_id', userId)
            .maybeSingle();
            
          if (memberResponse.error) {
            console.error('Error checking existing membership:', memberResponse.error);
            continue;
          }
          
          if (memberResponse.data) {
            console.log('Already a member of family:', invitation.family_id);
            continue; // Skip to next invitation
          }
          
          // Add user to the family_members table
          const memberInsertResponse = await supabase
            .from('family_members')
            .insert([{
              family_id: invitation.family_id,
              user_id: userId,
              role: invitation.role || 'Family Member',
              joined_at: new Date().toISOString()
            }]);
            
          if (memberInsertResponse.error) {
            console.error('Error adding to family:', memberInsertResponse.error);
            continue;
          }
          
          // Mark invitation as accepted
          const inviteUpdateResponse = await supabase
            .from('family_invitations')
            .update({ 
              accepted: true,
              user_id: userId
            })
            .eq('id', invitation.id);
                  
          if (inviteUpdateResponse.error) {
            console.error('Error updating invitation:', inviteUpdateResponse.error);
          } else {
            addedToAnyFamily = true;
            console.log('Successfully added to family:', invitation.family_id);
          }
        } catch (inviteProcessError) {
          console.error('Error processing invitation:', inviteProcessError);
          // Continue with next invitation instead of failing completely
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
        console.log('Initializing auth and checking for existing session...');
        
        // Safely check for active sessions
        let sessionResponse;
        try {
          sessionResponse = await supabase.auth.getSession();
          console.log('Session response received:', Boolean(sessionResponse));
        } catch (sessionError) {
          console.error('Error getting session:', sessionError);
          setLoading(false);
          return;
        }
        
        // Safely access the session data
        if (sessionResponse && sessionResponse.data && sessionResponse.data.session) {
          const sessionUser = sessionResponse.data.session.user;
          console.log('Active session found for user:', sessionUser.id);
          
          setUser(sessionUser);
          
          // Check for pending invitations if we have an email
          if (sessionUser.email) {
            try {
              await checkPendingInvitations(sessionUser.email, sessionUser.id);
            } catch (inviteError) {
              console.error('Error checking invitations on init:', inviteError);
              // Don't fail auth initialization if invitation check fails
            }
          }
        } else {
          console.log('No active session found');
        }
      } catch (error) {
        console.error('Error in auth initialization:', error);
      } finally {
        setLoading(false);
      }
    };

    // Run the initialization
    initAuth();

    // Set up auth state change listener with proper error handling
    let authSubscription = null;
    
    try {
      const authStateResponse = supabase.auth.onAuthStateChange(
        async (event, session) => {
          console.log('Auth state changed:', event);
          console.log('Session exists:', Boolean(session));
          
          if (session && session.user) {
            console.log('User from session:', session.user.id);
            setUser(session.user);
            
            // Check for pending invitations on new sign-ins
            if (event === 'SIGNED_IN' && session.user.email) {
              try {
                await checkPendingInvitations(session.user.email, session.user.id);
              } catch (inviteError) {
                console.error('Error checking invitations after auth state change:', inviteError);
                // Don't fail the auth flow if invitation check fails
              }
            }
          } else {
            console.log('No user in session after auth change');
            setUser(null);
          }
          
          setLoading(false);
        }
      );
      
      // Safely extract the subscription for cleanup
      if (authStateResponse && 
          authStateResponse.data && 
          authStateResponse.data.subscription) {
        authSubscription = authStateResponse.data.subscription;
      } else {
        console.warn('Auth state change did not return expected subscription object');
      }
    } catch (authListenerError) {
      console.error('Error setting up auth listener:', authListenerError);
    }
    
    // Return cleanup function with proper null checking
    return () => {
      if (authSubscription && 
          typeof authSubscription.unsubscribe === 'function') {
        console.log('Cleaning up auth subscription');
        authSubscription.unsubscribe();
      }
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      console.log('Starting sign-in process for:', email);
      
      // The main authentication call
      let authResponse;
      try {
        authResponse = await supabase.auth.signInWithPassword({ 
          email, 
          password 
        });
        console.log('Auth response received:', Boolean(authResponse));
      } catch (authError) {
        console.error('Error during auth API call:', authError);
        throw authError;
      }
      
      // Defensive checks on the response
      if (!authResponse) {
        throw new Error('No response from authentication service');
      }
      
      // Handle auth error
      if (authResponse.error) {
        console.error('Authentication error:', authResponse.error);
        throw authResponse.error;
      }
      
      // Safe access to user data
      const userData = authResponse.data?.user;
      if (!userData) {
        console.error('No user data in successful auth response');
        throw new Error('Authentication succeeded but no user data was returned');
      }
      
      console.log('Successfully authenticated user:', userData.id);
      setUser(userData);
      
      // Only try to check invitations if we have an email
      if (userData.email) {
        try {
          await checkPendingInvitations(userData.email, userData.id);
        } catch (inviteError) {
          console.error('Error checking invitations:', inviteError);
          // Don't fail the sign-in if invitation check fails
        }
      }
      
      // Return successful result
      return { 
        data: authResponse.data, 
        error: null 
      };
    } catch (error: any) {
      console.error('Sign-in process failed:', error);
      return { 
        data: null, 
        error 
      };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, userData: any) => {
    try {
      setLoading(true);
      console.log('Starting sign-up process for:', email);
      
      // Input validation
      if (!email || !password) {
        throw new Error('Email and password are required');
      }
      
      if (!userData || !userData.display_name) {
        throw new Error('Display name is required');
      }
      
      const cleanEmail = email.toLowerCase().trim();
      
      // Register user with Supabase
      let signUpResponse;
      try {
        signUpResponse = await supabase.auth.signUp({ 
          email: cleanEmail, 
          password 
        });
        console.log('Sign-up response received:', Boolean(signUpResponse));
      } catch (signUpError) {
        console.error('Error during sign-up API call:', signUpError);
        throw signUpError;
      }
      
      // Check for errors
      if (!signUpResponse) {
        throw new Error('No response from registration service');
      }
      
      if (signUpResponse.error) {
        console.error('Registration error:', signUpResponse.error);
        throw signUpResponse.error;
      }
      
      // Make sure we have user data
      if (!signUpResponse.data || !signUpResponse.data.user) {
        console.error('Sign-up succeeded but no user data returned');
        throw new Error('Registration succeeded but user data is missing');
      }
      
      const newUser = signUpResponse.data.user;
      console.log('User registered with ID:', newUser.id);
      
      // Create user profile with error handling
      try {
        const profileResponse = await supabase
          .from('user_profiles')
          .insert([{
            user_id: newUser.id,
            display_name: userData.display_name,
            created_at: new Date().toISOString()
          }]);
          
        if (profileResponse.error) {
          console.error('Error creating user profile:', profileResponse.error);
          // Don't fail registration if profile creation fails
        } else {
          console.log('Created user profile for:', newUser.id);
        }
      } catch (profileError) {
        console.error('Exception during profile creation:', profileError);
        // Don't fail registration if profile creation throws
      }
      
      // Check for invitations
      try {
        await checkPendingInvitations(cleanEmail, newUser.id);
      } catch (inviteError) {
        console.error('Error checking invitations during sign-up:', inviteError);
        // Don't fail registration if invitation check fails
      }
      
      // Force sign in after signup if verification is not required
      if (!signUpResponse.data.session) {
        console.log('No session after sign-up, attempting immediate sign-in');
        
        try {
          const signInResponse = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password
          });
          
          if (signInResponse.error) {
            console.error('Error during post-registration sign-in:', signInResponse.error);
          } else if (signInResponse.data && signInResponse.data.user) {
            console.log('Successfully signed in after registration');
            setUser(signInResponse.data.user);
          }
        } catch (signInError) {
          console.error('Exception during post-registration sign-in:', signInError);
          // Don't fail registration if automatic sign-in fails
        }
      } else {
        console.log('Session created during sign-up, setting user');
        setUser(newUser);
      }
      
      return { data: signUpResponse.data, error: null };
    } catch (error: any) {
      console.error('Sign-up process failed:', error);
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      console.log('Signing out user');
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Error during sign-out:', error);
      }
      
      setUser(null);
      console.log('User signed out successfully');
    } catch (error) {
      console.error('Exception during sign-out:', error);
    } finally {
      setLoading(false);
    }
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