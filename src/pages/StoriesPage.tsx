import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, BookOpen, Search, Filter, Clock, Star } from 'lucide-react';
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
          <div className="text-sm text-gray-500 mt-auto flex items-center">
            <Clock size={14} className="mr-1" />
            <span>
              {new Date(story.updated_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })}
            </span>
            {story.creator_name && (
              <span className="ml-auto text-primary-600">{story.creator_name}</span>
            )}
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

const StoriesPage: React.FC = () => {
  const { user } = useAuth();
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('updated_at');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStories = async () => {
      try {
        if (!user) {
          setLoading(false);
          return;
        }

        console.log("Fetching stories for user:", user.id);

        // Method 1: Get stories user has created - without trying to join with user_profiles
        const { data: createdStories, error: createdError } = await supabase
          .from('stories')
          .select('*')
          .eq('created_by', user.id)
          .order('updated_at', { ascending: false });

        if (createdError) {
          console.error("Error fetching created stories:", createdError);
          setError("Error loading stories: " + createdError.message);
        }

        // Method 2: Get stories from families the user belongs to
        // First, get the user's family IDs
        const { data: familyData, error: familyError } = await supabase
          .from('family_members')
          .select('family_id')
          .eq('user_id', user.id);

        if (familyError) {
          console.error("Error fetching family memberships:", familyError);
          setError("Error loading family data: " + familyError.message);
        }

        let familyStories: any[] = [];
        
        if (familyData && familyData.length > 0) {
          const familyIds = familyData.map(f => f.family_id);
          console.log("User belongs to family IDs:", familyIds);

          // Then fetch stories for those families - without trying to join with user_profiles
          const { data: familyStoriesData, error: storiesError } = await supabase
            .from('stories')
            .select('*')
            .in('family_id', familyIds)
            .order('updated_at', { ascending: false });

          if (storiesError) {
            console.error("Error fetching family stories:", storiesError);
            setError("Error loading family stories: " + storiesError.message);
          } else {
            familyStories = familyStoriesData || [];
          }
        }

        // Method 3: Get stories user is collaborating on
        const { data: collaborations, error: collabError } = await supabase
          .from('story_collaborators')
          .select('story_id')
          .eq('user_id', user.id);

        if (collabError) {
          console.error("Error fetching collaborations:", collabError);
        }

        let collaborativeStories: any[] = [];
        
        if (collaborations && collaborations.length > 0) {
          const storyIds = collaborations.map(c => c.story_id);
          console.log("User is collaborating on story IDs:", storyIds);

          const { data: collabStoriesData, error: collabStoriesError } = await supabase
            .from('stories')
            .select('*')
            .in('id', storyIds)
            .order('updated_at', { ascending: false });

          if (collabStoriesError) {
            console.error("Error fetching collaborative stories:", collabStoriesError);
          } else {
            collaborativeStories = collabStoriesData || [];
          }
        }

        // Combine all stories and remove duplicates
        const allStories = [...(createdStories || []), ...familyStories, ...collaborativeStories];
        const uniqueStories = Array.from(new Map(allStories.map(story => [story.id, story])).values());

        console.log(`Found ${uniqueStories.length} total stories`);

        // Get creator names in a separate query
        const creatorIds = Array.from(new Set(uniqueStories.map(story => story.created_by)));
        let creatorNames: Record<string, string> = {};
        
        if (creatorIds.length > 0) {
          const { data: profiles, error: profilesError } = await supabase
            .from('user_profiles')
            .select('user_id, display_name')
            .in('user_id', creatorIds);
            
          if (!profilesError && profiles) {
            profiles.forEach(profile => {
              creatorNames[profile.user_id] = profile.display_name;
            });
          }
        }

        // Format the stories with creator names
        const formattedStories = uniqueStories.map(story => ({
          ...story,
          creator_name: creatorNames[story.created_by] || 'Unknown'
        }));

        setStories(formattedStories);
      } catch (error: any) {
        console.error('Error in fetchStories:', error);
        setError(error.message || 'An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchStories();
  }, [user]);

  const filteredStories = stories.filter(story => 
    story.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        <Link 
          to="/stories/new" 
          className="btn-primary flex items-center"
        >
          <Plus size={18} className="mr-2" />
          New Story
        </Link>
      </div>

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