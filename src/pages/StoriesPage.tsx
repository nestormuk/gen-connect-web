import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, BookOpen, Search, Filter, Clock, Star, Users, Mail, Check, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Story {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  cover_image: string | null;
  created_by: string;
  creator_name?: string;
  creator_email?: string;
  family_id: string;
  family_name?: string;
}

interface Family {
  id: string;
  name: string;
}

interface Invitation {
  id: string;
  family_id: string;
  family_name: string;
  email: string;
  role: string;
  created_at: string;
  created_by: string;
  inviter_name?: string;
  inviter_email?: string;
  accepted: boolean;
}

interface FamilyMember {
  id: string;
  user_id: string;
  role: string;
  email: string;
  name?: string;
  avatar_url?: string;
}

const StoryCard: React.FC<{ story: Story }> = ({ story }) => {
  return (
    <Link to={`/stories/${story.id}`} className="block group">
      <motion.div 
        className="card h-full flex flex-col bg-white overflow-hidden"
        whileHover={{ y: -5 }}
        transition={{ type: 'spring', stiffness: 300 }}
      >
        <div className="aspect-[3/2] bg-gray-100 relative overflow-hidden">
          {story.cover_image ? (
            <img 
              src={story.cover_image} 
              alt={story.title} 
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-primary-50">
              <BookOpen className="h-12 w-12 text-primary-300" />
            </div>
          )}
        </div>
        <div className="p-4 flex-1 flex flex-col">
          <h3 className="font-semibold text-lg mb-2 text-gray-800 group-hover:text-primary-600 transition-colors">
            {story.title}
          </h3>
          <div className="text-sm text-gray-500 mb-2">
            <div className="flex items-center">
              <Clock size={14} className="mr-1" />
              <span>
                {new Date(story.updated_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })}
              </span>
            </div>
          </div>
          
          {/* Display creator info */}
          <div className="mt-auto">
            <div className="text-sm flex items-center justify-between">
              <span className="text-primary-600 font-medium">
                {story.creator_name || story.creator_email || 'Unknown'}
              </span>
              
              {story.family_name && (
                <span className="text-gray-500 flex items-center">
                  <Users size={14} className="mr-1" />
                  {story.family_name}
                </span>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </Link>
  );
};

const EmptyState: React.FC = () => {
  return (
    <div className="text-center py-12">
      <div className="mx-auto w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mb-4">
        <BookOpen className="h-8 w-8 text-primary-400" />
      </div>
      <h3 className="text-xl font-semibold text-gray-800 mb-2">No stories yet</h3>
      <p className="text-gray-600 max-w-md mx-auto mb-6">
        Create your first story and start your family storytelling journey.
      </p>
      <Link to="/stories/new" className="btn-primary inline-flex items-center">
        <Plus size={18} className="mr-2" />
        Create New Story
      </Link>
    </div>
  );
};

// New component to display pending invitations
const PendingInvitationsSection: React.FC<{
  invitations: Invitation[];
  onAccept: (id: string) => Promise<void>;
  onRefresh: () => void;
}> = ({ invitations, onAccept, onRefresh }) => {
  const [processingId, setProcessingId] = useState<string | null>(null);

  if (!invitations || invitations.length === 0) return null;

  const handleAccept = async (id: string) => {
    setProcessingId(id);
    try {
      await onAccept(id);
    } finally {
      setProcessingId(null);
      onRefresh();
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-800">Pending Family Invitations</h2>
        <button 
          onClick={onRefresh}
          className="btn-outline flex items-center text-sm"
        >
          <RefreshCw size={14} className="mr-1" />
          Refresh
        </button>
      </div>
      
      <div className="space-y-4">
        {invitations.map(invitation => (
          <div key={invitation.id} className="border border-primary-100 bg-primary-50 rounded-lg p-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-gray-800">
                  {invitation.family_name}
                </h3>
                <div className="text-sm text-gray-600 mt-1">
                  Invited by: <span className="font-medium">{invitation.inviter_name || invitation.inviter_email || 'Unknown'}</span>
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  Role: <span className="text-primary-600">{invitation.role}</span>
                </div>
              </div>
              
              <button
                onClick={() => handleAccept(invitation.id)}
                disabled={processingId === invitation.id}
                className="btn-primary flex items-center text-sm px-3 py-1.5"
              >
                {processingId === invitation.id ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-1"></div>
                ) : (
                  <Check size={14} className="mr-1" />
                )}
                Accept
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const StoriesPage: React.FC = () => {
  const { user } = useAuth();
  const [stories, setStories] = useState<Story[]>([]);
  const [families, setFamilies] = useState<Family[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('updated_at');
  const [filterByFamily, setFilterByFamily] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Function to refresh data
  const refreshData = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // Function to accept an invitation
  const acceptInvitation = async (invitationId: string) => {
    if (!user) return;
    
    try {
      // Find the invitation in state
      const invitation = pendingInvitations.find(inv => inv.id === invitationId);
      if (!invitation) return;
      
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
      
      // Mark invitation as accepted and associate with user account
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
      setPendingInvitations(prevInvitations => 
        prevInvitations.filter(inv => inv.id !== invitationId)
      );
      
      // Refresh data to show new stories
      refreshData();
      
    } catch (error: any) {
      console.error('Error accepting invitation:', error);
      alert('Failed to accept the invitation. Please try again.');
    }
  };

  // Fetch pending invitations
  useEffect(() => {
    const fetchPendingInvitations = async () => {
      if (!user || !user.email) return;
      
      try {
        // Get all invitations for this user's email that are not accepted
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
          .ilike('email', user.email.toLowerCase().trim())
          .eq('accepted', false);
        
        if (invitationsError) throw invitationsError;
        
        if (!invitationsData || invitationsData.length === 0) {
          setPendingInvitations([]);
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
          
          // Get inviter info
          const { data: inviterProfile } = await supabase
            .from('user_profiles')
            .select('display_name, user_id')
            .eq('user_id', invitation.created_by)
            .single();
            
          // Get inviter's email
          let inviterEmail = "Unknown";
          const { data: inviterInvitation } = await supabase
            .from('family_invitations')
            .select('email')
            .eq('user_id', invitation.created_by)
            .limit(1);
            
          if (inviterInvitation && inviterInvitation.length > 0) {
            inviterEmail = inviterInvitation[0].email;
          }
          
          return {
            ...invitation,
            family_name: familyData?.name || 'Unknown Family',
            inviter_name: inviterProfile?.display_name,
            inviter_email: inviterEmail
          };
        }));
        
        setPendingInvitations(extendedInvitations);
      } catch (err) {
        console.error('Error fetching pending invitations:', err);
      }
    };
    
    fetchPendingInvitations();
  }, [user, refreshTrigger]);

  useEffect(() => {
    const fetchAllAccessibleFamilies = async () => {
      if (!user) return [];
      
      try {
        // Get the families the user directly belongs to through membership
        const { data: familyMemberships, error: membershipError } = await supabase
          .from('family_members')
          .select('family_id')
          .eq('user_id', user.id);
          
        if (membershipError) throw membershipError;
        
        // Get families the user has been invited to and accepted
        const { data: acceptedInvitations, error: invitationError } = await supabase
          .from('family_invitations')
          .select('family_id')
          .eq('email', user.email)
          .eq('accepted', true);
          
        if (invitationError) throw invitationError;
        
        // Combine both sources of family IDs and remove duplicates
        let familyIds = [];
        
        if (familyMemberships && familyMemberships.length > 0) {
          familyIds = familyMemberships.map(fm => fm.family_id);
        }
        
        if (acceptedInvitations && acceptedInvitations.length > 0) {
          // Add only unique IDs that aren't already in the array
          acceptedInvitations.forEach(inv => {
            if (!familyIds.includes(inv.family_id)) {
              familyIds.push(inv.family_id);
            }
          });
        }
        
        if (familyIds.length === 0) {
          return [];
        }
        
        // Get family names
        const { data: familyData, error: familyError } = await supabase
          .from('family_groups')
          .select('id, name')
          .in('id', familyIds);
          
        if (familyError) throw familyError;
        
        setFamilies(familyData || []);
        return familyIds;
      } catch (err) {
        console.error('Error fetching accessible families:', err);
        return [];
      }
    };

    const fetchAllAccessibleStories = async () => {
      try {
        if (!user) {
          setLoading(false);
          return;
        }

        console.log("Fetching stories for user:", user.id);
        const familyIds = await fetchAllAccessibleFamilies();
        
        // Combine stories from multiple sources:
        // 1. Stories from families user is a member of
        // 2. Stories from families user is invited to
        // 3. User's own stories
        
        let allStories = [];
        
        // If user is a member of any families or has any invitations, get those stories
        if (familyIds.length > 0) {
          // Get all stories from all families the user has access to
          const { data: familyStories, error: familyStoriesError } = await supabase
            .from('stories')
            .select('*')
            .in('family_id', familyIds)
            .order('updated_at', { ascending: false });
            
          if (familyStoriesError) throw familyStoriesError;
          
          if (familyStories && familyStories.length > 0) {
            allStories = [...familyStories];
          }
        }
        
        // Always get the user's own stories (even if not in any families)
        const { data: ownStories, error: ownStoriesError } = await supabase
          .from('stories')
          .select('*')
          .eq('created_by', user.id)
          .order('updated_at', { ascending: false });
          
        if (ownStoriesError) throw ownStoriesError;
        
        // Combine with user's own stories (avoiding duplicates)
        if (ownStories && ownStories.length > 0) {
          // Add only stories that aren't already in allStories
          ownStories.forEach(story => {
            const isDuplicate = allStories.some(s => s.id === story.id);
            if (!isDuplicate) {
              allStories.push(story);
            }
          });
        }
        
        if (allStories.length === 0) {
          setStories([]);
          setLoading(false);
          return;
        }

        // Get creator info - improved to ensure we get all creator details
        const creatorIds = Array.from(new Set(allStories.map(story => story.created_by)));
        let creatorInfo: Record<string, { name?: string, email?: string }> = {};
        
        // Initialize with default values for all creators to prevent "Unknown" display
        creatorIds.forEach(creatorId => {
          creatorInfo[creatorId] = {
            name: undefined,
            email: undefined
          };
          
          // If this is the current user, set their info directly
          if (creatorId === user.id && user.email) {
            creatorInfo[creatorId] = {
              name: "You",
              email: user.email
            };
          }
        });
        
        // Get profile names for creators
        const { data: profiles, error: profilesError } = await supabase
          .from('user_profiles')
          .select('user_id, display_name')
          .in('user_id', creatorIds);
          
        if (!profilesError && profiles) {
          profiles.forEach(profile => {
            if (profile.user_id && profile.display_name) {
              if (!creatorInfo[profile.user_id]) {
                creatorInfo[profile.user_id] = {};
              }
              creatorInfo[profile.user_id].name = profile.display_name;
            }
          });
        }
        
        // Get emails from invitations for creators
        const { data: invitations, error: invitationsError } = await supabase
          .from('family_invitations')
          .select('user_id, email')
          .in('user_id', creatorIds);
          
        if (!invitationsError && invitations) {
          invitations.forEach(invitation => {
            if (invitation.user_id && invitation.email) {
              if (!creatorInfo[invitation.user_id]) {
                creatorInfo[invitation.user_id] = {};
              }
              // Only set email if it's not already set
              if (!creatorInfo[invitation.user_id].email) {
                creatorInfo[invitation.user_id].email = invitation.email;
              }
            }
          });
        }
        
        // Get family names for all relevant families
        const uniqueFamilyIds = Array.from(new Set(allStories.map(story => story.family_id)));
        
        const { data: familyGroups, error: familyGroupsError } = await supabase
          .from('family_groups')
          .select('id, name')
          .in('id', uniqueFamilyIds);
          
        const familyNames: Record<string, string> = {};
        if (!familyGroupsError && familyGroups) {
          familyGroups.forEach(family => {
            familyNames[family.id] = family.name;
          });
        }
        
        // Format stories with creator info and family names
        const formattedStories = allStories.map(story => {
          // Get creator information with proper fallbacks
          const creator = creatorInfo[story.created_by] || {};
          
          return {
            ...story,
            creator_name: creator.name || (story.created_by === user.id ? "You" : undefined),
            creator_email: creator.email,
            family_name: familyNames[story.family_id]
          };
        });
        
        // Sort all stories by updated_at (most recent first)
        formattedStories.sort((a, b) => 
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );
        
        setStories(formattedStories);
      } catch (error: any) {
        console.error('Error in fetchAllAccessibleStories:', error);
        setError(error.message || 'An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchAllAccessibleStories();
  }, [user, refreshTrigger]);

  // Filter stories based on search term and selected family
  const filteredStories = stories.filter(story => {
    const matchesSearch = story.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFamily = filterByFamily === 'all' || story.family_id === filterByFamily;
    return matchesSearch && matchesFamily;
  });

  // Sort stories based on selected sort option
  const sortedStories = [...filteredStories].sort((a, b) => {
    if (sortBy === 'title') {
      return a.title.localeCompare(b.title);
    }
    // Default: sort by updated_at (most recent first)
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Family Stories</h1>
        <div className="flex space-x-2">
          <button 
            onClick={refreshData}
            className="btn-outline flex items-center"
          >
            <RefreshCw size={16} className="mr-2" />
            Refresh
          </button>
          <Link 
            to="/stories/new" 
            className="btn-primary flex items-center"
          >
            <Plus size={18} className="mr-2" />
            New Story
          </Link>
        </div>
      </div>

      {/* Display pending invitations section */}
      {pendingInvitations.length > 0 && (
        <PendingInvitationsSection 
          invitations={pendingInvitations} 
          onAccept={acceptInvitation} 
          onRefresh={refreshData}
        />
      )}

      <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="input pl-10"
            placeholder="Search stories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        {/* Family filter */}
        {families.length > 0 && (
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Users className="h-5 w-5 text-gray-400" />
            </div>
            <select
              className="input pl-10 pr-10 appearance-none bg-white"
              value={filterByFamily}
              onChange={(e) => setFilterByFamily(e.target.value)}
            >
              <option value="all">All Families</option>
              {families.map(family => (
                <option key={family.id} value={family.id}>
                  {family.name}
                </option>
              ))}
            </select>
          </div>
        )}
        
        {/* Sort option */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Filter className="h-5 w-5 text-gray-400" />
          </div>
          <select
            className="input pl-10 pr-10 appearance-none bg-white"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="updated_at">Recently Updated</option>
            <option value="title">Title (A-Z)</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
        </div>
      ) : sortedStories.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedStories.map((story) => (
            <motion.div
              key={story.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <StoryCard story={story} />
            </motion.div>
          ))}
        </div>
      ) : (
        <EmptyState />
      )}
    </div>
  );
};

export default StoriesPage;