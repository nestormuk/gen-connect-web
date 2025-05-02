// src/services/emailService.ts

import { supabase } from '../lib/supabase';

export const sendInvitationEmail = async (
  recipientEmail: string, 
  familyName: string, 
  invitationCode: string,
  role: string
) => {
  try {
    // Save invitation to database first
    const { data: invitation, error: inviteError } = await supabase
      .from('family_invitations')
      .insert([{
        email: recipientEmail,
        invitation_code: invitationCode,
        role: role
      }])
      .select()
      .single();
      
    if (inviteError) throw inviteError;
    
    // Call the Edge Function to send the email
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: { 
        recipientEmail, 
        familyName, 
        invitationCode, 
        role 
      }
    });
    
    if (error) throw error;
    
    return { success: true };
  } catch (error) {
    console.error('Error sending invitation:', error);
    return { success: false, error };
  }
};