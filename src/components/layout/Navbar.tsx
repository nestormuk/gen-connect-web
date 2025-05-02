import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, Menu, Bell, User, LogOut, Mail } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabase';

interface NavbarProps {
  onMenuClick: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onMenuClick }) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [displayName, setDisplayName] = useState<string>('User');
  const [loading, setLoading] = useState<boolean>(true);
  // Add this state for tracking invitations count
  const [pendingInvitationsCount, setPendingInvitationsCount] = useState(0);

  useEffect(() => {
    async function fetchUserProfile() {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Fetch the user's profile from the database
        const { data, error } = await supabase
          .from('user_profiles')
          .select('display_name')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('Error fetching user profile in navbar:', error);
          // Fallback to email if there's an error
          setDisplayName(user.email?.split('@')[0] || 'User');
        } else if (data) {
          // Use the display name from the profile
          setDisplayName(data.display_name);
        } else {
          // Fallback to email if no profile found
          setDisplayName(user.email?.split('@')[0] || 'User');
        }
      } catch (err) {
        console.error('Error in fetchUserProfile for navbar:', err);
        setDisplayName(user.email?.split('@')[0] || 'User');
      } finally {
        setLoading(false);
      }
    }

    fetchUserProfile();
  }, [user]);

  // Add this useEffect to fetch pending invitations
  useEffect(() => {
    const fetchPendingInvitations = async () => {
      if (!user || !user.email) return;
      
      try {
        const { data, error } = await supabase
          .from('family_invitations')
          .select('id')
          .ilike('email', user.email.toLowerCase().trim())
          .eq('accepted', false);
          
        if (error) throw error;
        
        setPendingInvitationsCount(data?.length || 0);
      } catch (error) {
        console.error('Error checking pending invitations:', error);
      }
    };
    
    fetchPendingInvitations();
    
    // Set up real-time subscription for invitations
    const subscription = supabase
      .channel('public:family_invitations')
      .on('INSERT', (payload) => {
        // Check if the invitation is for the current user
        if (payload.new && payload.new.email === user?.email) {
          setPendingInvitationsCount(prev => prev + 1);
        }
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(subscription);
    };
  }, [user]);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/auth');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <header className="bg-white shadow-sm sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <button 
              className="p-2 rounded-md text-gray-500 md:hidden focus:outline-none focus:ring-2 focus:ring-primary-500"
              onClick={onMenuClick}
            >
              <Menu size={24} />
            </button>
            
            <Link to="/" className="flex items-center">
              <motion.div 
                className="flex items-center space-x-2 text-primary-700"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
              >
                <BookOpen className="h-8 w-8" />
                <span className="text-xl font-bold">GenConnect</span>
              </motion.div>
            </Link>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Add My Invitations link and badge here */}
            {user && (
              <Link 
                to="/my-invitations" 
                className="p-2 rounded-full text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 relative"
              >
                <Mail size={20} />
                {pendingInvitationsCount > 0 && (
                  <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                    {pendingInvitationsCount}
                  </span>
                )}
              </Link>
            )}
            
            <button className="p-2 rounded-full text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500">
              <Bell size={20} />
            </button>
            
            <div className="relative">
              <button 
                className="flex items-center space-x-2 focus:outline-none"
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700">
                  <User size={18} />
                </div>
                <span className="hidden md:block font-medium text-gray-700">
                  {loading ? (
                    <div className="h-4 w-20 bg-gray-200 animate-pulse rounded"></div>
                  ) : (
                    displayName
                  )}
                </span>
              </button>
              
              {showUserMenu && (
                <motion.div 
                  className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-20"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <Link 
                    to="/profile" 
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setShowUserMenu(false)}
                  >
                    Your Profile
                  </Link>
                  
                  {/* Add My Invitations link to dropdown menu */}
                  <Link 
                    to="/my-invitations" 
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-between"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <div className="flex items-center space-x-2">
                      <Mail size={16} />
                      <span>My Invitations</span>
                    </div>
                    {pendingInvitationsCount > 0 && (
                      <span className="bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                        {pendingInvitationsCount}
                      </span>
                    )}
                  </Link>
                  
                  <button 
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={handleSignOut}
                  >
                    <div className="flex items-center space-x-2">
                      <LogOut size={16} />
                      <span>Sign out</span>
                    </div>
                  </button>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;