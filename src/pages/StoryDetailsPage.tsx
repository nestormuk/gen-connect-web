import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { BookOpen, Edit, Share2, ChevronLeft, Heart, MessageSquare, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';

interface StoryData {
  id: string;
  title: string;
  content: {
    blocks: Array<{
      id: string;
      type: string;
      content: string;
    }>;
  };
  cover_image: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
  creator_name: string;
}

const StoryDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [story, setStory] = useState<StoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    // In a real app, we would fetch the story from Supabase
    // For demo purposes, let's simulate fetching a story
    setTimeout(() => {
      if (id === '1') {
        setStory({
          id: '1',
          title: 'Summer at Grandma\'s Lake House',
          content: {
            blocks: [
              {
                id: 'block-1',
                type: 'text',
                content: 'Every summer, we would visit Grandma Sarah at her lake house. The water was always crystal clear, and we would spend hours swimming and fishing.'
              },
              {
                id: 'block-2',
                type: 'text',
                content: 'Grandma would wake up early to make her famous blueberry pancakes. The kitchen would fill with the sweet smell of butter and maple syrup, and we would all gather around the big wooden table on the porch overlooking the lake.'
              },
              {
                id: 'block-3',
                type: 'text',
                content: 'One summer, when I was about 10 years old, Grandma taught me how to fish. I remember her patience as she showed me how to bait the hook and cast the line. "The secret," she would say, "is to be patient and respect the fish."'
              },
              {
                id: 'block-4',
                type: 'text',
                content: 'That same summer, we caught a bass that was bigger than any fish I\'d ever seen. Grandma let me reel it in mostly by myself, only helping when the fish gave a particularly strong pull. When we finally got it to shore, we took a picture of me holding it up proudly, with Grandma standing beside me, her hand on my shoulder.'
              },
              {
                id: 'block-5',
                type: 'text',
                content: 'That picture still sits on my desk today, reminding me of those golden summers at the lake house and the wisdom Grandma shared with me about fishing, cooking, and life.'
              }
            ]
          },
          cover_image: 'https://images.pexels.com/photos/2086622/pexels-photo-2086622.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
          created_at: '2023-06-15T12:00:00Z',
          updated_at: '2023-06-18T14:30:00Z',
          created_by: user?.id || '',
          creator_name: 'Grandma Sarah'
        });
      } else if (id === '2') {
        setStory({
          id: '2',
          title: 'Grandpa\'s Fishing Adventures',
          content: {
            blocks: [
              {
                id: 'block-1',
                type: 'text',
                content: 'Grandpa Joe has been fishing since he was a young boy. He has countless stories about fishing trips, the ones that got away, and his biggest catches.'
              }
            ]
          },
          cover_image: 'https://images.pexels.com/photos/7626313/pexels-photo-7626313.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
          created_at: '2023-05-10T09:15:00Z',
          updated_at: '2023-05-12T11:20:00Z',
          created_by: user?.id || '',
          creator_name: 'Grandpa Joe'
        });
      } else {
        navigate('/stories');
      }
      setLoading(false);
    }, 800);
  }, [id, navigate, user?.id]);

  const toggleLike = () => {
    setLiked(!liked);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!story) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Story not found</h2>
        <p className="text-gray-600 mb-6">
          The story you're looking for doesn't exist or has been removed.
        </p>
        <Link to="/stories" className="btn-primary">
          Back to Stories
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center mb-6">
        <Link 
          to="/stories" 
          className="p-2 rounded-full hover:bg-gray-100 text-gray-600"
        >
          <ChevronLeft size={24} />
        </Link>
        <span className="ml-2 text-gray-600">Back to stories</span>
      </div>

      {story.cover_image && (
        <div className="aspect-[3/1] rounded-xl overflow-hidden mb-6">
          <img 
            src={story.cover_image} 
            alt={story.title} 
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">{story.title}</h1>
        
        <div className="flex items-center text-sm text-gray-500 mb-4">
          <div className="flex items-center">
            <Clock size={16} className="mr-1" />
            <span>
              {new Date(story.updated_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })}
            </span>
          </div>
          <span className="mx-2">•</span>
          <span className="text-primary-600 font-medium">{story.creator_name}</span>
        </div>

        <div className="flex space-x-4">
          <button
            onClick={toggleLike}
            className={`flex items-center space-x-1 px-3 py-1 rounded-full text-sm ${
              liked ? 'bg-accent-100 text-accent-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Heart size={16} className={liked ? 'fill-accent-500 text-accent-500' : ''} />
            <span>{liked ? 'Liked' : 'Like'}</span>
          </button>
          
          <button className="flex items-center space-x-1 px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-600 hover:bg-gray-200">
            <MessageSquare size={16} />
            <span>Comment</span>
          </button>
          
          <button className="flex items-center space-x-1 px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-600 hover:bg-gray-200">
            <Share2 size={16} />
            <span>Share</span>
          </button>
        </div>
      </div>

      <div className="prose max-w-none">
        {story.content.blocks.map((block, index) => (
          <motion.div
            key={block.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            {block.type === 'text' && (
              <p className="text-lg text-gray-800 mb-6 leading-relaxed">{block.content}</p>
            )}
          </motion.div>
        ))}
      </div>

      <div className="mt-10 flex justify-between">
        <Link 
          to={`/stories/${story.id}/edit`} 
          className="btn-outline flex items-center"
        >
          <Edit size={18} className="mr-2" />
          Edit Story
        </Link>
      </div>
    </div>
  );
};

export default StoryDetailsPage;