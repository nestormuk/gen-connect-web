import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Edit, Clock, User, Share2, Trash2, Download, 
  BookOpen, Camera, Mic, Headphones, MessageCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface StoryMedia {
  id: string;
  media_type: string;
  media_url: string;
  created_at: string;
}

interface StoryDetail {
  id: string;
  title: string;
  content: any; // Can be a rich content object
  cover_image: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
  family_id: string;
  is_published: boolean;
  creator_name?: string;
  media?: StoryMedia[];
}

const StoryDetailPage: React.FC = () => {
  const { storyId } = useParams<{ storyId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [story, setStory] = useState<StoryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState('story');
  const [isCreator, setIsCreator] = useState(false);

  useEffect(() => {
    const fetchStoryDetails = async () => {
      if (!storyId || !user) {
        setLoading(false);
        setError("Invalid story ID or user not authenticated");
        return;
      }

      try {
        console.log("Fetching story with ID:", storyId);
        
        // Fetch the story details
        const { data: storyData, error: storyError } = await supabase
          .from('stories')
          .select('*')
          .eq('id', storyId)
          .single();

        if (storyError) {
          console.error("Error fetching story:", storyError);
          setError("Could not load the story. It might not exist or you don't have permission to view it.");
          setLoading(false);
          return;
        }

        // Check if user has access to this story
        const hasAccess = await checkUserAccess(storyData.family_id, storyData.created_by);
        if (!hasAccess) {
          setError("You don't have permission to view this story.");
          setLoading(false);
          return;
        }

        // Get creator's name
        let creatorName = 'Unknown Author';
        try {
          const { data: profileData } = await supabase
            .from('user_profiles')
            .select('display_name')
            .eq('user_id', storyData.created_by)
            .single();
            
          if (profileData) {
            creatorName = profileData.display_name;
          }
        } catch (err) {
          console.error("Error fetching creator profile:", err);
        }

        // Get story media
        const { data: mediaData, error: mediaError } = await supabase
          .from('story_media')
          .select('*')
          .eq('story_id', storyId)
          .order('created_at', { ascending: false });

        if (mediaError) {
          console.error("Error fetching story media:", mediaError);
        }

        setStory({
          ...storyData,
          creator_name: creatorName,
          media: mediaData || []
        });
        
        setIsCreator(storyData.created_by === user.id);
      } catch (err: any) {
        console.error("Error in fetchStoryDetails:", err);
        setError(err.message || "An error occurred while loading the story");
      } finally {
        setLoading(false);
      }
    };

    // Helper function to check if user has access to the story
    const checkUserAccess = async (familyId: string, creatorId: string) => {
      if (!user) return false;
      
      // User is the creator
      if (creatorId === user.id) return true;
      
      // User is a family member
      const { data: memberData } = await supabase
        .from('family_members')
        .select('id')
        .eq('family_id', familyId)
        .eq('user_id', user.id);
        
      if (memberData && memberData.length > 0) return true;
      
      // User is a collaborator
      const { data: collabData } = await supabase
        .from('story_collaborators')
        .select('id')
        .eq('story_id', storyId)
        .eq('user_id', user.id);
        
      if (collabData && collabData.length > 0) return true;
      
      return false;
    };

    fetchStoryDetails();
  }, [storyId, user]);

  const handleDeleteStory = async () => {
    if (!story || !isCreator) return;
    
    if (!window.confirm("Are you sure you want to delete this story? This action cannot be undone.")) {
      return;
    }
    
    try {
      setLoading(true);
      
      // Delete related media first
      if (story.media && story.media.length > 0) {
        const { error: mediaDeleteError } = await supabase
          .from('story_media')
          .delete()
          .eq('story_id', story.id);
          
        if (mediaDeleteError) {
          console.error("Error deleting story media:", mediaDeleteError);
          throw mediaDeleteError;
        }
      }
      
      // Delete collaborators
      const { error: collabDeleteError } = await supabase
        .from('story_collaborators')
        .delete()
        .eq('story_id', story.id);
        
      if (collabDeleteError) {
        console.error("Error deleting collaborators:", collabDeleteError);
        throw collabDeleteError;
      }
      
      // Delete the story
      const { error: storyDeleteError } = await supabase
        .from('stories')
        .delete()
        .eq('id', story.id);
        
      if (storyDeleteError) {
        console.error("Error deleting story:", storyDeleteError);
        throw storyDeleteError;
      }
      
      // Redirect to stories list
      navigate('/stories');
      
    } catch (err: any) {
      console.error("Error deleting story:", err);
      setError(err.message || "Failed to delete the story");
      setLoading(false);
    }
  };

  // Helper to render different types of media
  const renderMedia = (media: StoryMedia) => {
    switch (media.media_type) {
      case 'image':
        return (
          <div className="mb-6">
            <img 
              src={media.media_url} 
              alt="Story media" 
              className="w-full rounded-lg shadow-md"
            />
          </div>
        );
      case 'audio':
        return (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg flex items-center">
            <Mic className="text-primary-500 mr-3" />
            <div>
              <h4 className="font-medium">Audio Recording</h4>
              <audio controls className="mt-2">
                <source src={media.media_url} />
                Your browser does not support the audio element.
              </audio>
            </div>
          </div>
        );
      default:
        return (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <a 
              href={media.media_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary-600 hover:underline flex items-center"
            >
              <Download className="mr-2" size={18} />
              View Attachment
            </a>
          </div>
        );
    }
  };

  // Render story content from JSON
  // Updated renderStoryContent function for your specific content structure
const renderStoryContent = () => {
  if (!story?.content) {
    console.log("No content found in story");
    return <p className="text-gray-500 italic">This story has no content yet.</p>;
  }
  
  console.log("Content type:", typeof story.content);
  console.log("Content value:", story.content);
  
  // First try to parse if it's a JSON string (from JSONB field in Postgres)
  let parsedContent = story.content;
  if (typeof story.content === 'string') {
    try {
      parsedContent = JSON.parse(story.content);
      console.log("Successfully parsed string to:", parsedContent);
    } catch (e) {
      console.log("Not a valid JSON string or already parsed");
      // If it's not a valid JSON string, keep it as is
    }
  }
  
  // Handle your specific content structure: {"blocks": [{"id": "block-id", "type": "text", "content": "content text"}]}
  if (parsedContent.blocks && Array.isArray(parsedContent.blocks)) {
    console.log("Found custom blocks array with content property");
    
    return (
      <div className="space-y-4">
        {parsedContent.blocks.map((block: any, index: number) => {
          // Handle different block types
          switch (block.type) {
            case 'text':
              return <p key={block.id || index} className="mb-4">{block.content}</p>;
              
            case 'heading':
              return <h2 key={block.id || index} className="text-2xl font-bold mb-4">{block.content}</h2>;
              
            case 'image':
              return (
                <div key={block.id || index} className="mb-6">
                  <img 
                    src={block.content} 
                    alt="Story image" 
                    className="w-full rounded-lg shadow-md"
                  />
                  {block.caption && (
                    <p className="text-sm text-gray-500 mt-2 text-center">{block.caption}</p>
                  )}
                </div>
              );
              
            default:
              return <p key={block.id || index} className="mb-4">{block.content || JSON.stringify(block)}</p>;
          }
        })}
      </div>
    );
  }
  
  // Previous handlers for other content formats
  
  // Case 1: Content with editor.js style blocks
  if (parsedContent.blocks) {
    return parsedContent.blocks.map((block: any, index: number) => {
      switch (block.type) {
        case 'header':
          return <h2 key={index} className="text-2xl font-bold mb-4">{block.data.text}</h2>;
        case 'paragraph':
          return <p key={index} className="mb-4">{block.data.text}</p>;
        case 'image':
          return (
            <div key={index} className="mb-6">
              <img 
                src={block.data.url} 
                alt={block.data.caption || 'Story image'} 
                className="w-full rounded-lg shadow-md"
              />
              {block.data.caption && (
                <p className="text-sm text-gray-500 mt-2 text-center">{block.data.caption}</p>
              )}
            </div>
          );
        default:
          return <p key={index} className="mb-4">{JSON.stringify(block.data)}</p>;
      }
    });
  }
  
  // Case 2: Simple text property
  if (parsedContent.text) {
    return <div className="prose max-w-none">{parsedContent.text}</div>;
  }
  
  // Case 3: Content with sections
  if (parsedContent.sections) {
    return parsedContent.sections.map((section: any, index: number) => (
      <div key={index} className="mb-8">
        {section.title && <h2 className="text-2xl font-bold mb-4">{section.title}</h2>}
        <div className="prose max-w-none">
          {section.text && <p>{section.text}</p>}
        </div>
      </div>
    ));
  }
  
  // Case 4: HTML string (if stored directly as HTML)
  if (typeof parsedContent === 'string') {
    return <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: parsedContent }} />;
  }
  
  // Fallback for unknown formats
  return (
    <div>
      <p className="mb-4 text-gray-500 italic">Content format not recognized. Raw content:</p>
      <pre className="bg-gray-50 p-4 rounded overflow-auto">{JSON.stringify(parsedContent, null, 2)}</pre>
    </div>
  );
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
      <div className="max-w-4xl mx-auto py-8 px-4">
        <Link to="/stories" className="flex items-center text-gray-600 hover:text-primary-600 mb-8">
          <ArrowLeft size={18} className="mr-2" />
          Back to Stories
        </Link>
        
        <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg p-6 text-center">
          <h2 className="text-xl font-semibold mb-2">Error</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!story) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <Link to="/stories" className="flex items-center text-gray-600 hover:text-primary-600 mb-8">
          <ArrowLeft size={18} className="mr-2" />
          Back to Stories
        </Link>
        
        <div className="text-center py-12">
          <div className="mx-auto w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
            <BookOpen className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Story not found</h3>
          <p className="text-gray-600 max-w-md mx-auto mb-6">
            The story you're looking for doesn't exist or you don't have permission to view it.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <Link to="/stories" className="flex items-center text-gray-600 hover:text-primary-600 mb-8">
        <ArrowLeft size={18} className="mr-2" />
        Back to Stories
      </Link>
      
      {/* Story Header */}
      <div className="mb-8">
        <div className="flex justify-between items-start mb-4">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800">{story.title}</h1>
          
          {isCreator && (
            <div className="flex space-x-2">
              <Link to={`/stories/${story.id}/edit`} className="btn-outline flex items-center">
                <Edit size={16} className="mr-2" />
                Edit
              </Link>
              <button 
                onClick={handleDeleteStory} 
                className="btn-outline text-error-600 border-error-300 hover:bg-error-50"
              >
                <Trash2 size={16} className="mr-2" />
                Delete
              </button>
            </div>
          )}
        </div>
        
        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 mb-6">
          <div className="flex items-center">
            <Clock size={16} className="mr-1" />
            Last updated {new Date(story.updated_at).toLocaleDateString()}
          </div>
          <div className="flex items-center">
            <User size={16} className="mr-1" />
            {story.creator_name || 'Unknown Author'}
          </div>
          {story.is_published ? (
            <div className="bg-green-50 text-green-700 px-2 py-1 rounded-full text-xs font-medium">
              Published
            </div>
          ) : (
            <div className="bg-yellow-50 text-yellow-700 px-2 py-1 rounded-full text-xs font-medium">
              Draft
            </div>
          )}
        </div>
        
        {/* Cover Image */}
        {story.cover_image && (
          <div className="mb-8">
            <img 
              src={story.cover_image} 
              alt={story.title} 
              className="w-full h-64 md:h-96 object-cover rounded-xl shadow-md"
            />
          </div>
        )}
      </div>
      
      {/* Story Tabs */}
      <div className="border-b border-gray-200 mb-8">
        <div className="flex space-x-8">
          <button
            className={`pb-4 font-medium text-sm ${
              currentTab === 'story'
                ? 'border-b-2 border-primary-600 text-primary-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            onClick={() => setCurrentTab('story')}
          >
            <BookOpen size={18} className="inline mr-2" />
            Story
          </button>
          <button
            className={`pb-4 font-medium text-sm ${
              currentTab === 'media'
                ? 'border-b-2 border-primary-600 text-primary-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            onClick={() => setCurrentTab('media')}
          >
            <Camera size={18} className="inline mr-2" />
            Media ({story.media?.length || 0})
          </button>
          <button
            className={`pb-4 font-medium text-sm ${
              currentTab === 'audio'
                ? 'border-b-2 border-primary-600 text-primary-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            onClick={() => setCurrentTab('audio')}
          >
            <Headphones size={18} className="inline mr-2" />
            Audio
          </button>
        </div>
      </div>
      
      {/* Tab Content */}
      <div className="mb-12">
        {currentTab === 'story' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="prose max-w-none"
          >
            {renderStoryContent()}
          </motion.div>
        )}
        
        {currentTab === 'media' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {story.media && story.media.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {story.media
                  .filter(m => m.media_type === 'image')
                  .map(mediaItem => renderMedia(mediaItem))}
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <Camera className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-800 mb-2">No media yet</h3>
                <p className="text-gray-600 max-w-md mx-auto mb-6">
                  This story doesn't have any images or other media attached to it yet.
                </p>
                {isCreator && (
                  <Link to={`/stories/${story.id}/edit`} className="btn-primary inline-flex items-center">
                    <Plus size={18} className="mr-2" />
                    Add Media
                  </Link>
                )}
              </div>
            )}
          </motion.div>
        )}
        
        {currentTab === 'audio' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {story.media && story.media.filter(m => m.media_type === 'audio').length > 0 ? (
              <div className="space-y-4">
                {story.media
                  .filter(m => m.media_type === 'audio')
                  .map(mediaItem => renderMedia(mediaItem))}
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <Headphones className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-800 mb-2">No audio recordings</h3>
                <p className="text-gray-600 max-w-md mx-auto mb-6">
                  This story doesn't have any audio recordings attached to it yet.
                </p>
                {isCreator && (
                  <Link to={`/stories/${story.id}/edit`} className="btn-primary inline-flex items-center">
                    <Mic size={18} className="mr-2" />
                    Add Recording
                  </Link>
                )}
              </div>
            )}
          </motion.div>
        )}
      </div>
      
      {/* Share and Actions */}
      <div className="flex justify-between items-center p-6 bg-gray-50 rounded-xl">
        <div>
          <h3 className="font-semibold text-gray-800 mb-1">Share this story</h3>
          <p className="text-sm text-gray-600">
            Share this family story with your loved ones
          </p>
        </div>
        <button className="btn-primary flex items-center">
          <Share2 size={18} className="mr-2" />
          Share
        </button>
      </div>
    </div>
  );
};

export default StoryDetailPage;